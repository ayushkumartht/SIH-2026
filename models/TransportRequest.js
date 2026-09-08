import mongoose from "mongoose";

const transportRequestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    pickupLatitude: { type: Number, required: true, min: -90, max: 90 },
    pickupLongitude: { type: Number, required: true, min: -180, max: 180 },
    destinationHospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["requested", "searching_driver", "driver_assigned", "dispatched", "en_route", "arrived", "completed", "cancelled"],
      default: "requested",
      required: true,
    },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Ambulance" },
    requestedAt: { type: Date, default: Date.now },
    driverAssignedAt: Date,
    dispatchedAt: Date,
    enRouteAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

transportRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.TransportRequest || mongoose.model("TransportRequest", transportRequestSchema);
