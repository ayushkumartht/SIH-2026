import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";

export async function createConsultation(data) {
  return Consultation.create(data);
}

export async function findConsultation(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Consultation.findById(id);
}

export async function saveConsultation(consultation) {
  return consultation.save();
}
