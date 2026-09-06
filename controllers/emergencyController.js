import Emergency from '../models/Emergency.js';
import Doctor from '../models/doctor.js';

export const listEmergencies = async (req, res, next) => {
  try {
    const { severity, isResolved } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (typeof isResolved !== 'undefined') filter.isResolved = isResolved === 'true';
    const items = await Emergency.find(filter).populate('patientId').populate('assignedDoctor');
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const createEmergency = async (req, res, next) => {
  try {
    const created = await Emergency.create(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (e) { next(e); }
};

export const assignDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    const doc = await Doctor.findById(doctorId);
    if (!doc) return res.status(400).json({ success: false, error: 'Invalid doctor', statusCode: 400 });
    const updated = await Emergency.findByIdAndUpdate(req.params.id, { assignedDoctor: doctorId }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const resolveEmergency = async (req, res, next) => {
  try {
    const updated = await Emergency.findByIdAndUpdate(req.params.id, { isResolved: true, resolvedAt: new Date() }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Emergency not found', statusCode: 404 });
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


