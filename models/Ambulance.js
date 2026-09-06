import mongoose from "mongoose";

const ambulanceSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ["basic", "advanced_life_support", "patient_transport"],
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "assigned", "en_route", "at_scene", "out_of_service"],
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
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
  },
  { timestamps: true }
);

ambulanceSchema.index({ currentLocation: "2dsphere" });

export default mongoose.models.Ambulance || mongoose.model("Ambulance", ambulanceSchema);