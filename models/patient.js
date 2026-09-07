import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    age: { type: Number },
    gender: { type: String },
    contact: { type: String },
    history: { type: String },
    village: { type: String, trim: true },
    createdByAsha: { type: String, index: true },
    lastKnownLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      accuracyMeters: { type: Number, min: 0 },
      recordedAt: Date,
    },

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },

    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "LabReport" }]  
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;
