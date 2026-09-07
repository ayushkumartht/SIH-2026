import mongoose from "mongoose";

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ["basic", "advanced_life_support", "patient_transport"],
      default: "basic",
    },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    capacity: { type: Number, default: 1, min: 1 },
    currentLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    status: {
      type: String,
      enum: ["available", "dispatched", "en_route", "busy", "maintenance"],
      default: "available",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Ambulance || mongoose.model("Ambulance", ambulanceSchema);
