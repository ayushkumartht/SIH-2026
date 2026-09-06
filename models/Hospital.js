import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    emergencyCapability: {
      type: String,
      enum: ["none", "basic", "advanced"],
      default: "basic",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "temporarily_unavailable", "inactive"],
      default: "active",
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coordinates) => coordinates.length === 2,
          message: "Coordinates must contain longitude and latitude",
        },
      },
    },
    address: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ location: "2dsphere" });

export default mongoose.models.Hospital || mongoose.model("Hospital", hospitalSchema);