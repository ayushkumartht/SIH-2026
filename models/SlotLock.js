import mongoose from 'mongoose';
const { Schema } = mongoose;

const SlotLockSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

SlotLockSchema.index({ doctorId:1, date:1, timeSlot:1 }, { unique: true });
SlotLockSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 });

export default mongoose.model('SlotLock', SlotLockSchema);
