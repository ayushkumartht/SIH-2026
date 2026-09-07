import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";
import { recordConsultationAudit } from "./consultationAuditStore.js";

const demoConsultations = new Map();

export async function createConsultation(data) {
  if (process.env.DEMO_MODE !== "true") return Consultation.create(data);

  const now = new Date();
  const consultation = {
    ...data,
    _id: `demo-${new mongoose.Types.ObjectId().toString()}`,
    status: data.status || "created",
    outcome: data.outcome || "pending",
    consent: data.consent || { granted: false },
    createdAt: now,
    updatedAt: now,
  };
  demoConsultations.set(consultation._id, consultation);
  await recordConsultationAudit({ consultationId: consultation._id, action: "created", actorId: "system", actorRole: "system" });
  if (consultation.consent.granted) {
    await recordConsultationAudit({ consultationId: consultation._id, action: "consent_granted", actorId: consultation.consent.grantedBy || "demo", actorRole: "demo" });
  }
  return consultation;
}

export async function findConsultation(id) {
  if (process.env.DEMO_MODE === "true") return demoConsultations.get(id) || null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Consultation.findById(id);
}

export async function saveConsultation(consultation) {
  if (process.env.DEMO_MODE === "true") {
    consultation.updatedAt = new Date();
    demoConsultations.set(consultation._id, consultation);
    return consultation;
  }
  return consultation.save();
}

export function listConsultations(filter = {}) {
  if (process.env.DEMO_MODE !== "true") return [];
  return [...demoConsultations.values()].filter((consultation) => Object.entries(filter).every(([key, value]) => String(consultation[key]) === String(value)));
}