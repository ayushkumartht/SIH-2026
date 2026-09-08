import { calculateNetworkQuality } from "../utils/networkQuality.js";
import { findCallRoom, saveCallRoom } from "../services/callRoomStore.js";
import { findConsultation, saveConsultation } from "../services/consultationStore.js";
import { recordConsultationAudit } from "../services/consultationAuditStore.js";

function isCallParticipant(call, user) {
  if (!user) return false;
  return (
    (user.role === 'patient' && String(call.patientId) === String(user.id)) ||
    (user.role === 'doctor' && String(call.doctorId) === String(user.id)) ||
    (user.role === 'asha' && String(call.ashaId) === String(user.id))
  );
}

export const updateCallQuality = async (req, res, next) => {
  try {
    const call = await findCallRoom(req.params.callId);
    if (!call) return res.status(404).json({ success: false, error: "Call room not found" });
    if (!isCallParticipant(call, req.user)) return res.status(403).json({ success: false, error: 'You are not a participant in this call' });

    const quality = calculateNetworkQuality(req.body);
    const qualityRecord = {
      tier: quality.tier,
      rttMs: quality.rttMs,
      packetLossPercent: quality.packetLossPercent,
      recordedAt: new Date(),
    };

    call.networkTier = quality.tier;
    call.currentQuality = qualityRecord;
    call.qualityHistory.push(qualityRecord);
    await saveCallRoom(call);
    if (call.consultationId) {
      const consultation = await findConsultation(call.consultationId);
      if (consultation) {
        consultation.networkQualityHistory = consultation.networkQualityHistory || [];
        consultation.networkQualityHistory.push(qualityRecord);
        await saveConsultation(consultation);
      }
    }

    const io = req.app.get("io");
    io?.to(call.roomId).emit("quality:changed", {
      callId: call._id,
      roomId: call.roomId,
      ...quality,
    });

    res.json({ success: true, data: { callId: call._id, roomId: call.roomId, ...quality } });
  } catch (error) {
    next(error);
  }
};

export const recordCallVitals = async (req, res, next) => {
  try {
    const call = await findCallRoom(req.params.callId);
    if (!call) return res.status(404).json({ success: false, error: "Call room not found" });
    if (!isCallParticipant(call, req.user)) return res.status(403).json({ success: false, error: 'You are not a participant in this call' });

    call.vitals.push({
      ...req.body,
      recordedBy: req.body.recordedBy || req.user?.id,
      source: req.body.source || "patient",
    });
    await saveCallRoom(call);
    if (call.consultationId) {
      const consultation = await findConsultation(call.consultationId);
      if (consultation) {
        consultation.vitals = consultation.vitals || [];
        consultation.vitals.push({ ...req.body, recordedBy: req.body.recordedBy || req.user?.id, source: req.body.source || "patient" });
        await saveConsultation(consultation);
        await recordConsultationAudit({ consultationId: consultation._id, action: "vitals_recorded", actorId: String(req.user?.id || "demo"), actorRole: req.user?.role || "demo" });
      }
    }

    res.status(201).json({ success: true, data: call.vitals[call.vitals.length - 1] });
  } catch (error) {
    next(error);
  }
};

export const endCall = async (req, res, next) => {
  try {
    const call = await findCallRoom(req.params.callId);
    if (!call) return res.status(404).json({ success: false, error: "Call room not found" });
    if (!isCallParticipant(call, req.user)) return res.status(403).json({ success: false, error: 'You are not a participant in this call' });

    call.status = "ended";
    call.endedAt = new Date();
    if (req.body.reason) call.endReason = req.body.reason;
    await saveCallRoom(call);
    if (call.consultationId) {
      const consultation = await findConsultation(call.consultationId);
      if (consultation) {
        consultation.status = "completed";
        consultation.completedAt = consultation.completedAt || new Date();
        await saveConsultation(consultation);
        await recordConsultationAudit({ consultationId: consultation._id, action: "call_ended", actorId: String(req.user?.id || "demo"), actorRole: req.user?.role || "demo" });
      }
    }

    const io = req.app.get("io");
    io?.to(call.roomId).emit("call:ended", {
      callId: call._id,
      roomId: call.roomId,
      endedAt: call.endedAt,
      reason: call.endReason,
    });

    res.json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
};
