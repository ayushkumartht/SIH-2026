import mongoose from "mongoose";

const labReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String }, 
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const labPatientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    contact: { type: String },
    history: { type: String }, 
    reports: [labReportSchema], 
  },
  { _id: true }
);

const labDoctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    specialization: { type: String, default: "Lab Doctor" },
    mobile: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: true,
    },
    patients: [labPatientSchema], 
  },
  { timestamps: true }
);

const LabDoctor = mongoose.model("LabDoctor", labDoctorSchema);

export default LabDoctor;