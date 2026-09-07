import Appointment from "../models/Appointment.js";
import { v4 as uuidv4 } from "uuid";
import {
  createCallRoom,
  findActiveRoomForAppointment,
  findCallRoom,
  saveCallRoom,
} from "../services/callRoomStore.js";
import {
  createConsultation,
  findConsultation,
  saveConsultation,
} from "../services/consultationStore.js";
import { resolveInitialNetworkQuality } from "../utils/networkQuality.js";
import { recordConsultationAudit } from "../services/consultationAuditStore.js";

function same(value, expected) {
  return String(value) === String(expected);
}
function isParticipant(room, user) {
  return user?.role === "patient"
    ? same(room.patientId, user.id)
    : user?.role === "doctor"
      ? same(room.doctorId, user.id)
      : false;
}
async function appointmentById(id) {
  return Appointment.findById(id);
}

export async function createOrJoinAppointmentCall(req, res, next) {
  try {
    const { appointmentId, networkTier } = req.body;
    if (!appointmentId)
      return res
        .status(400)
        .json({ success: false, error: "appointmentId is required" });
    const appointment = await appointmentById(appointmentId);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, error: "Appointment not found" });
    const patientId = appointment.patient;
    const doctorId = appointment.doctorId;
    const participant =
      req.user?.role === "patient"
        ? same(patientId, req.user.id)
        : req.user?.role === "doctor"
          ? same(doctorId, req.user.id)
          : false;
    if (!participant)
      return res
        .status(403)
        .json({
          success: false,
          error: "You are not assigned to this appointment",
        });
    let room = await findActiveRoomForAppointment(appointmentId);
    if (!room) {
      const consultation = await createConsultation({
        patientId: String(patientId),
        doctorId: String(doctorId),
        appointmentId,
        symptoms: appointment.reason || "",
        consent: { granted: false },
        status: "created",
      });
      room = await createCallRoom({
        roomId: uuidv4(),
        appointmentId: String(appointmentId),
        doctorId: String(doctorId),
        patientId: String(patientId),
        consultationId: String(consultation._id),
        mode: "webrtc",
        networkTier: resolveInitialNetworkQuality({ networkTier }).tier,
        currentQuality: resolveInitialNetworkQuality({ networkTier }),
      });
      consultation.callRoom = room._id;
      await saveConsultation(consultation);
      await recordConsultationAudit({
        consultationId: consultation._id,
        action: "call_room_created",
        actorId: String(req.user.id),
        actorRole: req.user.role,
      });
    }
    const consultation = await findConsultation(room.consultationId);
    res.json({
      success: true,
      data: {
        roomId: room.roomId,
        callId: room._id,
        consultationId: room.consultationId,
        consentGranted: Boolean(consultation?.consent?.granted),
        networkTier: room.networkTier,
        appointment: {
          id: String(appointment._id),
          reason: appointment.reason,
          date: appointment.date,
          time: appointment.time,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function grantCallConsent(req, res, next) {
  try {
    const room = await findCallRoom(req.params.callId);
    if (!room)
      return res
        .status(404)
        .json({ success: false, error: "Call room not found" });
    if (!isParticipant(room, req.user))
      return res
        .status(403)
        .json({
          success: false,
          error: "You are not a participant in this call",
        });
    if (req.user.role !== "patient")
      return res
        .status(403)
        .json({
          success: false,
          error: "Only the patient can grant consultation consent",
        });
    const consultation = await findConsultation(room.consultationId);
    if (!consultation)
      return res
        .status(404)
        .json({ success: false, error: "Consultation not found" });
    consultation.consent = {
      granted: true,
      grantedAt: new Date(),
      grantedBy: String(req.user.id),
    };
    await saveConsultation(consultation);
    await recordConsultationAudit({
      consultationId: consultation._id,
      action: "consent_granted",
      actorId: String(req.user.id),
      actorRole: req.user.role,
    });
    res.json({ success: true, data: { consentGranted: true } });
  } catch (error) {
    next(error);
  }
}

export async function joinCallDetails(req, res, next) {
  try {
    const room = await findCallRoom(req.params.callId);
    if (!room)
      return res
        .status(404)
        .json({ success: false, error: "Call room not found" });
    if (!isParticipant(room, req.user))
      return res
        .status(403)
        .json({
          success: false,
          error: "You are not a participant in this call",
        });
    const consultation = await findConsultation(room.consultationId);
    res.json({
      success: true,
      data: {
        roomId: room.roomId,
        callId: room._id,
        consultationId: room.consultationId,
        networkTier: room.networkTier,
        currentQuality: room.currentQuality,
        vitals: room.vitals || [],
        consultation,
      },
    });
  } catch (error) {
    next(error);
  }
}
