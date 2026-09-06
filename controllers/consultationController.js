import { findConsultation, saveConsultation } from "../services/consultationStore.js";
import { findCallRoom } from "../services/callRoomStore.js";
import { listConsultationAudits, recordConsultationAudit } from "../services/consultationAuditStore.js";

function auditActor(req) {
  return { actorId: String(req.user?.id || "demo"), actorRole: req.user?.role || "demo" };
}

export async function getConsultationAudits(req, res, next) {
  try {
    const consultation = await findConsultation(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, error: "Consultation not found" });
    const audits = await listConsultationAudits(consultation._id);
    res.json({ success: true, data: audits });
  } catch (error) {
    next(error);
  }
}

export async function getConsultationForRoom(req, res, next) {
  try {
    const call = await findCallRoom(req.params.callId);
    if (!call?.consultationId) return res.status(404).json({ success: false, error: "Consultation not found" });
    const consultation = await findConsultation(call.consultationId);
    if (!consultation) return res.status(404).json({ success: false, error: "Consultation not found" });
    res.json({ success: true, data: consultation });
  } catch (error) {
    next(error);
  }
}

export async function getConsultation(req, res, next) {
  try {
    const consultation = await findConsultation(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, error: "Consultation not found" });
    res.json({ success: true, data: consultation });
  } catch (error) {
    next(error);
  }
}

export async function updateConsultation(req, res, next) {
  try {
    const consultation = await findConsultation(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, error: "Consultation not found" });

    const allowedFields = ["symptoms", "assessment", "outcome", "prescription", "advice", "followUpAt"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) consultation[field] = req.body[field];
    }

    if (req.body.consent === true && !consultation.consent.granted) {
      consultation.consent = {
        granted: true,
        grantedAt: new Date(),
        grantedBy: req.user?.id || "demo",
      };
      await recordConsultationAudit({ consultationId: consultation._id, action: "consent_granted", ...auditActor(req) });
    }

    if (req.body.status) consultation.status = req.body.status;
    if (consultation.status === "in_progress" && !consultation.startedAt) consultation.startedAt = new Date();
    if (consultation.status === "completed" && !consultation.completedAt) consultation.completedAt = new Date();
    if (req.body.assessment || req.body.advice || req.body.prescription) {
      await recordConsultationAudit({ consultationId: consultation._id, action: "assessment_updated", ...auditActor(req) });
    }
    await saveConsultation(consultation);
    res.json({ success: true, data: consultation });
  } catch (error) {
    next(error);
  }
}