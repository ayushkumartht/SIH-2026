import Driver from '../models/Driver.js';
import Ambulance from '../models/Ambulance.js';
import Emergency from '../models/Emergency.js';
import TransportRequest from '../models/TransportRequest.js';
import DispatchAttempt from '../models/DispatchAttempt.js';
import { respondToDispatch } from '../services/dispatchEngine.js';
import {
  EMERGENCY_TRANSITIONS,
  EMERGENCY_TIMESTAMP_FIELD,
  TRANSPORT_TRANSITIONS,
  TRANSPORT_TIMESTAMP_FIELD,
} from '../utils/dispatchStateMachine.js';

const KIND_CONFIG = {
  emergency: { Model: Emergency, statusField: 'dispatchStatus', transitions: EMERGENCY_TRANSITIONS, timestampField: EMERGENCY_TIMESTAMP_FIELD },
  transport: { Model: TransportRequest, statusField: 'status', transitions: TRANSPORT_TRANSITIONS, timestampField: TRANSPORT_TIMESTAMP_FIELD },
};

async function findMyAmbulance(driverId) {
  return Ambulance.findOne({ driver: driverId });
}

export const getMyProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ success: false, error: 'Driver not found', statusCode: 404 });

    const ambulance = await findMyAmbulance(driver._id);
    let activeJob = null;
    if (ambulance) {
      const [emergency, transport] = await Promise.all([
        Emergency.findOne({ assignedVehicle: ambulance._id, dispatchStatus: { $nin: ['closed', 'cancelled'] } })
          .populate('patient', 'name age gender contact village')
          .populate('selectedHospital', 'name address contact latitude longitude')
          .sort({ createdAt: -1 }),
        TransportRequest.findOne({ assignedVehicle: ambulance._id, status: { $nin: ['completed', 'cancelled'] } })
          .populate('patient', 'name age gender contact village')
          .populate('destinationHospital', 'name address contact latitude longitude')
          .sort({ createdAt: -1 }),
      ]);
      if (emergency) activeJob = { kind: 'emergency', ...emergency.toObject() };
      else if (transport) activeJob = { kind: 'transport', ...transport.toObject() };
    }

    const history = ambulance
      ? await Promise.all([
          Emergency.find({ assignedVehicle: ambulance._id, dispatchStatus: { $in: ['closed', 'cancelled'] } }).sort({ closedAt: -1 }).limit(10),
          TransportRequest.find({ assignedVehicle: ambulance._id, status: { $in: ['completed', 'cancelled'] } }).sort({ completedAt: -1 }).limit(10),
        ]).then(([e, t]) => [...e.map((x) => ({ kind: 'emergency', ...x.toObject() })), ...t.map((x) => ({ kind: 'transport', ...x.toObject() }))])
      : [];

    res.json({
      success: true,
      data: {
        driver: { id: driver._id, name: driver.name, phone: driver.phone, licenseNo: driver.licenseNo, email: driver.email, status: driver.status },
        ambulance,
        activeJob,
        history,
      },
    });
  } catch (e) { next(e); }
};

export const updateMyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'off_duty'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be available or off_duty', statusCode: 400 });
    }
    const driver = await Driver.findByIdAndUpdate(req.user.id, { status }, { new: true });
    if (!driver) return res.status(404).json({ success: false, error: 'Driver not found', statusCode: 404 });

    const ambulance = await findMyAmbulance(driver._id);
    if (ambulance) {
      if (status === 'off_duty' && ambulance.status === 'available') {
        ambulance.status = 'maintenance';
        await ambulance.save();
      } else if (status === 'available' && ambulance.status === 'maintenance') {
        ambulance.status = 'available';
        await ambulance.save();
      }
    }

    res.json({ success: true, data: { status: driver.status } });
  } catch (e) { next(e); }
};

export const respondToJob = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { decision } = req.body;
    if (!['accept', 'decline'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'decision must be accept or decline', statusCode: 400 });
    }
    const attempt = await DispatchAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ success: false, error: 'Dispatch offer not found', statusCode: 404 });
    if (String(attempt.driver) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'This offer was not sent to you', statusCode: 403 });
    }

    const result = await respondToDispatch(attemptId, decision, 'app');
    if (!result.ok) {
      return res.status(409).json({ success: false, error: `Offer already ${result.reason}`, statusCode: 409 });
    }
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const updateJobStatus = async (req, res, next) => {
  try {
    const { kind, requestId } = req.params;
    const { status } = req.body;
    const config = KIND_CONFIG[kind];
    if (!config) return res.status(400).json({ success: false, error: 'Invalid job kind', statusCode: 400 });

    const job = await config.Model.findById(requestId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found', statusCode: 404 });

    const ambulance = await findMyAmbulance(req.user.id);
    if (!ambulance || String(job.assignedVehicle) !== String(ambulance._id)) {
      return res.status(403).json({ success: false, error: 'This job is not assigned to you', statusCode: 403 });
    }

    const allowedNext = config.transitions[job[config.statusField]] || [];
    if (!allowedNext.includes(status)) {
      return res.status(409).json({ success: false, error: `Cannot move from ${job[config.statusField]} to ${status}`, statusCode: 409 });
    }

    job[config.statusField] = status;
    const timestampField = config.timestampField[status];
    if (timestampField) job[timestampField] = new Date();
    await job.save();

    if (['closed', 'cancelled', 'completed'].includes(status)) {
      ambulance.status = 'available';
      await ambulance.save();
    } else if (status === 'en_route') {
      ambulance.status = 'en_route';
      await ambulance.save();
    }

    const io = req.app.get('io');
    io?.emit(kind === 'emergency' ? 'emergency:status_changed' : 'transport:status_changed', { id: job._id, status: job[config.statusField] });

    res.json({ success: true, data: job });
  } catch (e) { next(e); }
};
