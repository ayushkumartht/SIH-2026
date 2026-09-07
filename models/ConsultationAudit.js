import mongoose from "mongoose";

const consultationAuditSchema = new mongoose.Schema(
  {
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true, index: true },
    action: {
      type: String,
      enum: [
        "created",
        "consent_granted",
        "assessment_updated",
        "vitals_recorded",
        "call_ended",
        "record_viewed",
        "asha_assigned",
        "location_shared",
        "doctor_viewed_call_care",
        "call_room_created",
      ],
      required: true,
    },
    actorId: String,
    actorRole: { type: String, enum: ["patient", "asha", "doctor", "system", "demo"], required: true },
    metadata: mongoose.Schema.Types.Mixed,
    occurredAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.ConsultationAudit || mongoose.model("ConsultationAudit", consultationAuditSchema);