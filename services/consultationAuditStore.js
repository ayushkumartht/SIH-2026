import mongoose from "mongoose";
import ConsultationAudit from "../models/ConsultationAudit.js";

const demoAudits = new Map();

export async function recordConsultationAudit(data) {
  if (process.env.DEMO_MODE !== "true") return ConsultationAudit.create(data);
  const audit = { ...data, _id: `demo-${new mongoose.Types.ObjectId().toString()}`, occurredAt: data.occurredAt || new Date() };
  const current = demoAudits.get(String(data.consultationId)) || [];
  current.push(audit);
  demoAudits.set(String(data.consultationId), current);
  return audit;
}

export async function listConsultationAudits(consultationId) {
  if (process.env.DEMO_MODE === "true") return demoAudits.get(String(consultationId)) || [];
  return ConsultationAudit.find({ consultationId }).sort({ occurredAt: 1 });
}