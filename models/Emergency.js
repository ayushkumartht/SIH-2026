import mongoose from "mongoose";

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
      enum: ["patient", "asha", "doctor"],
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    title: {
      type: String,
      trim: true,
    },
    details: {
      type: String,
      default: "",
    },
    dispatchStatus: {
      type: String,
      enum: [
        "pending",
        "searching_ambulance",
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
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
    },
    selectedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    etaMinutes: {
      type: Number,
      min: 0,
    },
    vehicleAssignedAt: Date,
    dispatchedAt: Date,
    enRouteAt: Date,
    arrivedAt: Date,
    atHospitalAt: Date,
    handoverAt: Date,
    closedAt: Date,
    cancelledAt: Date,
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

emergencySchema.index({ dispatchStatus: 1, severity: 1, createdAt: -1 });

const Emergency = mongoose.models.Emergency || mongoose.model("Emergency", emergencySchema);

export default Emergency;
