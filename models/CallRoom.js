// models/CallRoom.js
import mongoose from "mongoose";

const qualitySchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      enum: ["unknown", "hd", "low_res", "audio_only", "very_poor"],
      required: true,
    },
    rttMs: { type: Number, min: 0 },
    packetLossPercent: { type: Number, min: 0, max: 100 },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    temperatureC: { type: Number, min: 20, max: 50 },
    heartRateBpm: { type: Number, min: 0, max: 300 },
    respiratoryRateBpm: { type: Number, min: 0, max: 100 },
    oxygenSaturationPercent: { type: Number, min: 0, max: 100 },
    systolicBp: { type: Number, min: 0, max: 300 },
    diastolicBp: { type: Number, min: 0, max: 200 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId },
    source: { type: String, enum: ["patient", "asha", "doctor", "device"] },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CallRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    consultationId: { type: String },
    doctorId: String,
    patientId: String,
    mode: {
      type: String,
      enum: ["daily", "webrtc"],
      default: "webrtc",
      required: true,
    },
    networkTier: {
      type: String,
      enum: ["unknown", "hd", "low_res", "audio_only", "very_poor"],
      default: "unknown",
      required: true,
    },
    currentQuality: qualitySchema,
    qualityHistory: { type: [qualitySchema], default: [] },
    vitals: { type: [vitalsSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "ended", "failed"],
      default: "active",
      required: true,
    },
    startedAt: Date,
    endedAt: Date,
    endReason: {
      type: String,
      enum: ["normal", "network_failure", "cancelled", "patient_left", "doctor_left", "unknown"],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CallRoom = mongoose.models.CallRoom || mongoose.model("CallRoom", CallRoomSchema);

export default CallRoom;
