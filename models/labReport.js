import mongoose from "mongoose";

const labreportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "uploadedByRole" },

    uploadedByRole: { type: String, required: true, enum: ["Doctor", "LabDoctor"] },

    files: [{ type: String }], 
  },
  { timestamps: true }
);

const LabReport = mongoose.models.LabReport || mongoose.model("LabReport", labreportSchema);
export default LabReport;