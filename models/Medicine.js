import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    category: { type: String, trim: true },
    unit: { type: String, default: "tablets" },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 20, min: 0 },
    lastRestockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

medicineSchema.index({ hospital: 1, name: 1 });

export default mongoose.models.Medicine || mongoose.model("Medicine", medicineSchema);
