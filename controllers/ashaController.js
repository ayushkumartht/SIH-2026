import Patient from '../models/patient.js';
import Consultation from '../models/Consultation.js';
import { findCallRoom } from '../services/callRoomStore.js';
import { findConsultation, saveConsultation } from '../services/consultationStore.js';
import { recordConsultationAudit } from '../services/consultationAuditStore.js';

const cleanPatient = (patient) => ({ id: patient._id, name: patient.name, age: patient.age, gender: patient.gender, contact: patient.contact, village: patient.village, history: patient.history, lastKnownLocation: patient.lastKnownLocation, createdAt: patient.createdAt });

async function allowedPatient(patientId, ashaId) {
  return Patient.findOne({ _id: patientId, $or: [{ createdByAsha: String(ashaId) }, { createdByAsha: { $exists: false } }, { createdByAsha: null }] });
}

export async function getAshaDashboard(req, res, next) {
  try {
    const patients = await Patient.find({ createdByAsha: String(req.user.id) }).select('name age gender contact village history lastKnownLocation createdAt').sort({ updatedAt: -1 });
    const consultations = await Consultation.find({ ashaId: String(req.user.id) }).sort({ updatedAt: -1 }).limit(30);
    res.json({ success: true, data: { patients: patients.map(cleanPatient), consultations, pendingSync: 0 } });
  } catch (error) { next(error); }
}

export async function registerAshaPatient(req, res, next) {
  try {
    const { name, age, gender, contact, village, history, consent } = req.body;
    if (!name || !Number.isInteger(Number(age)) || !gender || !village || consent !== true) return res.status(400).json({ success: false, error: 'Name, age, gender, village and recorded consent are required' });
    const patient = await Patient.create({ name: name.trim(), age: Number(age), gender, contact: contact?.trim(), village: village.trim(), history: history?.trim(), createdByAsha: String(req.user.id) });
    res.status(201).json({ success: true, data: cleanPatient(patient) });
  } catch (error) { next(error); }
}

export async function recordAshaVitals(req, res, next) {
  try {
    const { consultationId, temperatureC, heartRateBpm, respiratoryRateBpm, oxygenSaturationPercent, systolicBp, diastolicBp } = req.body;
    const consultation = await findConsultation(consultationId);
    if (!consultation || String(consultation.ashaId) !== String(req.user.id)) return res.status(403).json({ success: false, error: 'You are not assigned to this consultation' });
    const vital = { temperatureC, heartRateBpm, respiratoryRateBpm, oxygenSaturationPercent, systolicBp, diastolicBp, source: 'asha', recordedBy: String(req.user.id), recordedAt: new Date() };
    consultation.vitals = consultation.vitals || []; consultation.vitals.push(vital); await saveConsultation(consultation);
    await recordConsultationAudit({ consultationId, action: 'vitals_recorded', actorId: String(req.user.id), actorRole: 'asha' });
    res.status(201).json({ success: true, data: vital });
  } catch (error) { next(error); }
}

export async function assignAshaToCall(req, res, next) {
  try {
    const call = await findCallRoom(req.params.callId);
    if (!call) return res.status(404).json({ success: false, error: 'Call room not found' });
    const consultation = await findConsultation(call.consultationId);
    if (!consultation) return res.status(404).json({ success: false, error: 'Consultation not found' });
    consultation.ashaId = String(req.user.id); await saveConsultation(consultation);
    await recordConsultationAudit({ consultationId: consultation._id, action: 'asha_assigned', actorId: String(req.user.id), actorRole: 'asha' });
    res.json({ success: true, data: { consultationId: consultation._id, ashaId: consultation.ashaId } });
  } catch (error) { next(error); }
}

export async function updateAshaPatientLocation(req, res, next) {
  try {
    const { latitude, longitude, accuracyMeters, consent } = req.body;
    if (consent !== true || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return res.status(400).json({ success: false, error: 'Explicit consent and valid location coordinates are required' });
    const patient = await allowedPatient(req.params.patientId, req.user.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found or not in your care list' });
    patient.lastKnownLocation = { latitude, longitude, accuracyMeters, recordedAt: new Date() }; await patient.save();
    res.json({ success: true, data: patient.lastKnownLocation });
  } catch (error) { next(error); }
}
