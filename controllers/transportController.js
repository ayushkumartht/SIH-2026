import TransportRequest from '../models/TransportRequest.js';
import Hospital from '../models/Hospital.js';
import DispatchAttempt from '../models/DispatchAttempt.js';
import { startDispatch } from '../services/dispatchEngine.js';

export const createTransportRequest = async (req, res, next) => {
  try {
    const { pickupLatitude, pickupLongitude, destinationHospital, notes } = req.body;
    if (!Number.isFinite(pickupLatitude) || !Number.isFinite(pickupLongitude) || !destinationHospital) {
      return res.status(400).json({ success: false, error: 'pickupLatitude, pickupLongitude and destinationHospital are required', statusCode: 400 });
    }
    const hospital = await Hospital.findById(destinationHospital);
    if (!hospital) return res.status(404).json({ success: false, error: 'Hospital not found', statusCode: 404 });

    const created = await TransportRequest.create({
      patient: req.user.id,
      pickupLatitude,
      pickupLongitude,
      destinationHospital,
      notes: notes || '',
    });
    res.status(201).json({ success: true, data: created });

    startDispatch('transport', created, req.app.get('io')).catch((e) =>
      console.error('[transportController] startDispatch failed:', e),
    );
  } catch (e) { next(e); }
};

export const listTransportRequests = async (req, res, next) => {
  try {
    const filter = req.user.role === 'patient' ? { patient: req.user.id } : {};
    const items = await TransportRequest.find(filter)
      .populate('patient', 'name age gender contact village')
      .populate('destinationHospital', 'name address contact')
      .populate({ path: 'assignedVehicle', populate: { path: 'driver' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const getDispatchLog = async (req, res, next) => {
  try {
    const items = await DispatchAttempt.find({ requestType: 'transport', requestId: req.params.id })
      .populate('driver', 'name phone')
      .populate('ambulance', 'vehicleNumber')
      .sort({ createdAt: 1 });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const cancelTransportRequest = async (req, res, next) => {
  try {
    const request = await TransportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: 'Transport request not found', statusCode: 404 });
    if (req.user.role === 'patient' && String(request.patient) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not your request', statusCode: 403 });
    }
    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(409).json({ success: false, error: `Cannot cancel a ${request.status} request`, statusCode: 409 });
    }
    request.status = 'cancelled';
    request.cancelledAt = new Date();
    await request.save();
    req.app.get('io')?.emit('transport:status_changed', { id: request._id, status: 'cancelled' });
    res.json({ success: true, data: request });
  } catch (e) { next(e); }
};
