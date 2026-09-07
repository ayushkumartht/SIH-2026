import ConsultationAudit from "../models/ConsultationAudit.js";

export async function recordConsultationAudit(data) {
  return ConsultationAudit.create(data);
}

export async function listConsultationAudits(consultationId) {
  return ConsultationAudit.find({ consultationId }).sort({ occurredAt: 1 });
}
