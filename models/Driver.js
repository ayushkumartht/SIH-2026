import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    licenseNo: { type: String, required: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    status: {
      type: String,
      enum: ["available", "on_duty", "off_duty"],
      default: "available",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Driver || mongoose.model("Driver", driverSchema);
