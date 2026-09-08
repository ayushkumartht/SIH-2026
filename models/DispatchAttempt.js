import mongoose from "mongoose";

const dispatchAttemptSchema = new mongoose.Schema(
  {
    requestType: { type: String, enum: ["emergency", "transport"], required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    ambulance: { type: mongoose.Schema.Types.ObjectId, ref: "Ambulance" },
    channel: { type: [String], enum: ["app", "call", "sms"], default: ["app"] },
    status: {
      type: String,
      enum: ["ringing", "accepted", "declined", "timeout", "cancelled"],
      default: "ringing",
      required: true,
    },
    distanceKm: { type: Number },
    calledAt: { type: Date, default: Date.now },
    respondedAt: Date,
    respondedVia: { type: String, enum: ["app", "call", "sms"] },
    twilioCallSid: String,
    twilioSmsSid: String,
    note: String,
  },
  { timestamps: true }
);

dispatchAttemptSchema.index({ requestType: 1, requestId: 1, createdAt: -1 });

export default mongoose.models.DispatchAttempt || mongoose.model("DispatchAttempt", dispatchAttemptSchema);
