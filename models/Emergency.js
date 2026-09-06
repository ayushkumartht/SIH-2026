import mongoose from "mongoose";

const geoPointSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

const emergencySchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    reportedByRole: {
      type: String,
      enum: ["patient", "asha"],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    emergencyType: {
      type: String,
      enum: ["medical", "trauma", "accident", "pregnancy", "fire", "other"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    gpsLocation: {
      type: geoPointSchema,
      required: true,
    },
    pickupLocation: {
      type: geoPointSchema,
      required: true,
    },
    dispatchStatus: {
      type: String,
      enum: [
        "pending",
        "searching_ambulance",
        "mobility_fallback",
        "vehicle_assigned",
        "dispatched",
        "en_route",
        "arrived",
        "at_hospital",
        "handed_over",
        "cancelled",
        "closed",
      ],
      default: "pending",
      required: true,
    },
    dispatchMode: {
      type: String,
      enum: ["ambulance", "verified_mobility_fallback"],
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    selectedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    eta: {
      type: Date,
    },
    etaMinutes: {
      type: Number,
      min: 0,
    },
    ambulanceSearchStartedAt: Date,
    mobilityFallbackVerifiedAt: Date,
    vehicleAssignedAt: Date,
    dispatchedAt: Date,
    pickupAt: Date,
    arrivedAt: Date,
    hospitalMatchedAt: Date,
    hospitalPreAlertedAt: Date,
    handoverAt: Date,
    closedAt: Date,
    cancelledAt: Date,
    title: {
      type: String,
      trim: true,
    },
    details: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    doctorNote: {
      type: String,
      default: "",
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

emergencySchema.index({ gpsLocation: "2dsphere" });
emergencySchema.index({ pickupLocation: "2dsphere" });
emergencySchema.index({ dispatchStatus: 1, severity: 1, createdAt: -1 });

const Emergency = mongoose.models.Emergency || mongoose.model("Emergency", emergencySchema);

export default Emergency;
