import Emergency from '../models/Emergency.js';
import Ambulance from '../models/Ambulance.js';
import Doctor from '../models/doctor.js';
import { haversineKm } from '../utils/geo.js';

const ALLOWED_TRANSITIONS = {
  pending: ['searching_ambulance', 'vehicle_assigned', 'cancelled'],
  searching_ambulance: ['vehicle_assigned', 'cancelled'],
  vehicle_assigned: ['dispatched', 'cancelled'],
  dispatched: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['at_hospital', 'cancelled'],
  at_hospital: ['handed_over'],
  handed_over: ['closed'],
  cancelled: [],
  closed: [],
};

const TIMESTAMP_FIELD = {
  vehicle_assigned: 'vehicleAssignedAt',
  dispatched: 'dispatchedAt',
  en_route: 'enRouteAt',
  arrived: 'arrivedAt',
  at_hospital: 'atHospitalAt',
  closed: 'closedAt',
  cancelled: 'cancelledAt',
};

function emitEmergency(req, event, emergency) {
  const io = req.app.get('io');
  io?.emit(event, { emergencyId: emergency._id, dispatchStatus: emergency.dispatchStatus });
}

function scopeFilterForUser(user, query) {
  if (user.role === 'patient') return { patient: user.id };
  if (user.role === 'asha') return { reportedBy: user.id, reportedByRole: 'asha' };
  if (user.role === 'doctor') return { doctor: user.id };
  // admin, receptionist see everything, optionally filtered
  const filter = {};
  if (query.severity) filter.severity = query.severity;
  if (query.dispatchStatus) filter.dispatchStatus = query.dispatchStatus;
  return filter;
}

export const listEmergencies = async (req, res, next) => {
  try {
    const filter = scopeFilterForUser(req.user, req.query);
    const items = await Emergency.find(filter)
      .populate('patient', 'name age gender contact village')
      .populate('doctor', 'name specialization')
      .populate({ path: 'assignedVehicle', populate: { path: 'driver' } })
      .populate('selectedHospital', 'name address contact')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const createEmergency = async (req, res, next) => {
  try {
    const { emergencyType, severity, latitude, longitude, title, details } = req.body;
    if (!emergencyType || !severity || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, error: 'emergencyType, severity, latitude and longitude are required', statusCode: 400 });
    }

    let patientId;
    if (req.user.role === 'patient') {
      patientId = req.user.id;
    } else if (['asha', 'doctor'].includes(req.user.role)) {
      patientId = req.body.patientId;
      if (!patientId) return res.status(400).json({ success: false, error: 'patientId is required', statusCode: 400 });
    } else {
      return res.status(403).json({ success: false, error: 'Only a patient, ASHA worker, or doctor can raise an emergency', statusCode: 403 });
    }

    const created = await Emergency.create({
      patient: patientId,
      reportedByRole: req.user.role,
      reportedBy: req.user.id,
      emergencyType,
      severity,
      latitude,
      longitude,
      title,
      details,
    });
    emitEmergency(req, 'emergency:new', created);
    res.status(201).json({ success: true, data: created });
  } catch (e) { next(e); }
};

export const suggestAmbulances = async (req, res, next) => {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });

    const available = await Ambulance.find({ status: 'available', 'currentLocation.latitude': { $ne: null } }).populate('driver');
    const ranked = available
      .map((ambulance) => ({
        ambulance,
        distanceKm: haversineKm(
          emergency.latitude,
          emergency.longitude,
          ambulance.currentLocation.latitude,
          ambulance.currentLocation.longitude,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
      .map(({ ambulance, distanceKm }) => ({ ...ambulance.toObject(), distanceKm: Number(distanceKm.toFixed(2)) }));

    res.json({ success: true, data: ranked });
  } catch (e) { next(e); }
};

export const assignVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
    if (!['pending', 'searching_ambulance'].includes(emergency.dispatchStatus)) {
      return res.status(409).json({ success: false, error: `Cannot assign a vehicle while status is ${emergency.dispatchStatus}`, statusCode: 409 });
    }
    const ambulance = await Ambulance.findById(vehicleId);
    if (!ambulance) return res.status(404).json({ success: false, error: 'Ambulance not found', statusCode: 404 });
    if (ambulance.status !== 'available') {
      return res.status(409).json({ success: false, error: 'Ambulance is not available', statusCode: 409 });
    }

    ambulance.status = 'dispatched';
    await ambulance.save();

    emergency.assignedVehicle = ambulance._id;
    emergency.dispatchStatus = 'vehicle_assigned';
    emergency.vehicleAssignedAt = new Date();
    await emergency.save();

    emitEmergency(req, 'emergency:status_changed', emergency);
    res.json({ success: true, data: emergency });
  } catch (e) { next(e); }
};

export const updateDispatchStatus = async (req, res, next) => {
  try {
    const { status, hospitalId } = req.body;
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });

    const allowedNext = ALLOWED_TRANSITIONS[emergency.dispatchStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(409).json({ success: false, error: `Cannot move from ${emergency.dispatchStatus} to ${status}`, statusCode: 409 });
    }

    if (status === 'at_hospital' && hospitalId) {
      emergency.selectedHospital = hospitalId;
    }

    emergency.dispatchStatus = status;
    const timestampField = TIMESTAMP_FIELD[status];
    if (timestampField) emergency[timestampField] = new Date();
    await emergency.save();

    if (['closed', 'cancelled'].includes(status) && emergency.assignedVehicle) {
      await Ambulance.findByIdAndUpdate(emergency.assignedVehicle, { status: 'available' });
    } else if (status === 'en_route' && emergency.assignedVehicle) {
      await Ambulance.findByIdAndUpdate(emergency.assignedVehicle, { status: 'en_route' });
    }

    emitEmergency(req, 'emergency:status_changed', emergency);
    res.json({ success: true, data: emergency });
  } catch (e) { next(e); }
};

export const assignDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    const doc = await Doctor.findById(doctorId);
    if (!doc) return res.status(400).json({ success: false, error: 'Invalid doctor', statusCode: 400 });
    const updated = await Emergency.findByIdAndUpdate(req.params.id, { doctor: doctorId }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
    if (!doc.emergencies.includes(updated._id)) {
      doc.emergencies.push(updated._id);
      await doc.save();
    }
    emitEmergency(req, 'emergency:status_changed', updated);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const acknowledgeEmergency = async (req, res, next) => {
  try {
    const { doctorNote } = req.body;
    const update = { acknowledged: true };
    if (doctorNote) update.doctorNote = doctorNote;
    const updated = await Emergency.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const resolveEmergency = async (req, res, next) => {
  try {
    const updated = await Emergency.findByIdAndUpdate(req.params.id, { dispatchStatus: 'closed', closedAt: new Date() }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
    if (updated.assignedVehicle) await Ambulance.findByIdAndUpdate(updated.assignedVehicle, { status: 'available' });
    emitEmergency(req, 'emergency:status_changed', updated);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const deleteEmergency = async (req, res, next) => {
  try {
    const deleted = await Emergency.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
    res.json({ success: true, data: null });
  } catch (e) { next(e); }
};
