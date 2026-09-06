import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number },
    gender: { type: String },
    contact: { type: String },
    history: { type: String },

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },

    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "LabReport" }]  
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;