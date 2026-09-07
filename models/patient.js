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

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },

    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "LabReport" }]  
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;