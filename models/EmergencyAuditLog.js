import mongoose from "mongoose";

const emergencyAuditLogSchema = new mongoose.Schema(
  {
    emergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Emergency",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "created",
        "ambulance_search_started",
        "mobility_fallback_verified",
        "vehicle_assigned",
        "driver_assigned",
        "dispatched",
        "picked_up",
        "hospital_matched",
        "hospital_pre_alerted",
        "arrived_at_hospital",
        "handed_over",
        "cancelled",
        "closed",
      ],
      required: true,
    },
    actorType: {
      type: String,
      enum: ["patient", "asha", "dispatcher", "driver", "hospital", "system"],
      required: true,
    },
    actorId: mongoose.Schema.Types.ObjectId,
    fromStatus: String,
    toStatus: String,
    metadata: mongoose.Schema.Types.Mixed,
    occurredAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true }
);

emergencyAuditLogSchema.index({ emergency: 1, occurredAt: 1 });

export default mongoose.models.EmergencyAuditLog ||
  mongoose.model("EmergencyAuditLog", emergencyAuditLogSchema);