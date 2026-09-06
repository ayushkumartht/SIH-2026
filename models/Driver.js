import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "suspended"],
      default: "pending",
      required: true,
    },
    availability: {
      type: String,
      enum: ["available", "assigned", "unavailable"],
      default: "available",
      required: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (coordinates) => !coordinates || coordinates.length === 2,
          message: "Coordinates must contain longitude and latitude",
        },
      },
    },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: "2dsphere" });

export default mongoose.models.Driver || mongoose.model("Driver", driverSchema);