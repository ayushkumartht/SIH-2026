import { v4 as uuidv4 } from 'uuid';
import Patient from '../models/patient.js';
import Doctor from '../models/doctor.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import { findCallRoom, saveCallRoom, createCallRoom, findActiveRoomForAppointment } from '../services/callRoomStore.js';
import { findConsultation, saveConsultation, createConsultation } from '../services/consultationStore.js';
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
    call.ashaId = String(req.user.id); await saveCallRoom(call);
    await recordConsultationAudit({ consultationId: consultation._id, action: 'asha_assigned', actorId: String(req.user.id), actorRole: 'asha' });
    res.json({ success: true, data: { consultationId: consultation._id, ashaId: consultation.ashaId } });
  } catch (error) { next(error); }
}

export async function listAshaDoctors(req, res, next) {
  try {
    const doctors = await Doctor.find({ status: { $ne: 'on-leave' } })
      .select('name specialization availability status')
      .limit(50);
    res.json({ success: true, data: doctors });
  } catch (error) { next(error); }
}

// ASHA is physically with the patient (who often has no smartphone/data of
// their own) and starts an immediate video consultation on the patient's
// behalf, using her own device. This creates the appointment + call room in
// one step rather than requiring a pre-booked slot, since it's a walk-in
// field visit, not a scheduled remote booking.
export async function createOrJoinAshaCall(req, res, next) {
  try {
    const { patientId, doctorId, appointmentId, reason } = req.body;

    let appointment;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId);
      if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    } else {
      if (!patientId || !doctorId) return res.status(400).json({ success: false, error: 'patientId and doctorId are required' });
      const patient = await allowedPatient(patientId, req.user.id);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient not found or not in your care list' });
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

      // Reuse a still-open walk-in appointment from the last few hours for
      // this same patient+doctor pair instead of creating a fresh one every
      // time — otherwise retrying/reopening the call clutters the doctor's
      // queue with duplicate confirmed appointments for the same visit.
      const recentCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
      appointment = await Appointment.findOne({
        patient: patient._id,
        doctorId: String(doctor._id),
        appointmentType: 'video',
        status: 'confirmed',
        createdAt: { $gte: recentCutoff },
      }).sort({ createdAt: -1 });

      if (!appointment) {
        const now = new Date();
        appointment = await Appointment.create({
          patient: patient._id,
          doctorId: String(doctor._id),
          date: now,
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          reason: reason || 'ASHA-assisted teleconsultation',
          appointmentType: 'video',
          status: 'confirmed',
          bookingMode: 'online',
          createdAt: now,
        });
      }
    }

    const patient = await allowedPatient(appointment.patient, req.user.id);
    if (!patient) return res.status(403).json({ success: false, error: 'You are not assigned to this patient' });

    // Formally link the patient to this doctor (if not already assigned to
    // one) so they show up everywhere in the doctor's dashboard — not just
    // buried in the appointment queue — the two dashboards need to agree on
    // who this patient's doctor is, not just share a one-off appointment.
    if (!patient.doctor) {
      patient.doctor = appointment.doctorId;
      await patient.save();
    }

    let room = await findActiveRoomForAppointment(appointment._id);
    if (!room) {
      const consultation = await createConsultation({
        patientId: String(appointment.patient),
        doctorId: String(appointment.doctorId),
        appointmentId: appointment._id,
        ashaId: String(req.user.id),
        symptoms: appointment.reason || '',
        consent: { granted: true, grantedAt: new Date(), grantedBy: String(req.user.id) },
        status: 'created',
      });
      room = await createCallRoom({
        roomId: uuidv4(),
        appointmentId: String(appointment._id),
        doctorId: String(appointment.doctorId),
        patientId: String(appointment.patient),
        ashaId: String(req.user.id),
        consultationId: String(consultation._id),
        mode: 'webrtc',
      });
      consultation.callRoom = room._id;
      await saveConsultation(consultation);
      await recordConsultationAudit({ consultationId: consultation._id, action: 'call_room_created', actorId: String(req.user.id), actorRole: 'asha' });
    } else if (!room.ashaId) {
      room.ashaId = String(req.user.id);
      await saveCallRoom(room);
    }

    req.app.get('io')?.to(`doctor:${appointment.doctorId}`).emit('consultation:incoming_call', {
      via: 'asha',
      appointmentId: String(appointment._id),
      patientName: patient.name,
      ashaEmail: req.user?.email,
      reason: appointment.reason,
    });

    res.json({
      success: true,
      data: {
        roomId: room.roomId,
        callId: room._id,
        consultationId: room.consultationId,
        consentGranted: true,
        networkTier: room.networkTier,
        appointment: { id: String(appointment._id), reason: appointment.reason, date: appointment.date, time: appointment.time },
        patient: { id: String(patient._id), name: patient.name, age: patient.age, gender: patient.gender },
      },
    });
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
