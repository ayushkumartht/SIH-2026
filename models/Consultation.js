import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    ashaId: { type: String },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    callRoom: { type: mongoose.Schema.Types.ObjectId, ref: "CallRoom" },
    status: {
      type: String,
      enum: ["created", "in_progress", "completed", "cancelled"],
      default: "created",
      required: true,
    },
    consent: {
      granted: { type: Boolean, default: false, required: true },
      grantedAt: Date,
      grantedBy: String,
    },
    symptoms: { type: String, trim: true },
    vitals: [{
      temperatureC: { type: Number, min: 20, max: 50 },
      heartRateBpm: { type: Number, min: 0, max: 300 },
      respiratoryRateBpm: { type: Number, min: 0, max: 100 },
      oxygenSaturationPercent: { type: Number, min: 0, max: 100 },
      systolicBp: { type: Number, min: 0, max: 300 },
      diastolicBp: { type: Number, min: 0, max: 200 },
      source: { type: String, enum: ["patient", "asha", "doctor", "device"] },
      recordedBy: String,
      recordedAt: { type: Date, default: Date.now },
    }],
    networkQualityHistory: [{
      tier: { type: String, enum: ["unknown", "hd", "low_res", "audio_only", "very_poor"] },
      rttMs: { type: Number, min: 0 },
      packetLossPercent: { type: Number, min: 0, max: 100 },
      recordedAt: { type: Date, default: Date.now },
    }],
    assessment: { type: String, trim: true },
    outcome: {
      type: String,
      enum: ["pending", "not_urgent", "urgent", "referred"],
      default: "pending",
      required: true,
    },
    prescription: { type: String, trim: true },
    advice: { type: String, trim: true },
    followUpAt: Date,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Consultation || mongoose.model("Consultation", consultationSchema);