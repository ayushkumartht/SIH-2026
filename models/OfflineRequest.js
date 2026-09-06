import mongoose from 'mongoose';
const { Schema } = mongoose;

const OfflineRequestSchema = new Schema({
  source: { type: String, enum: ['sms','ivr'], required: true },
  rawMessage: String,
  parsed: {
    name: String,
    contact: String,
    gender: String,
    department: String,
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    date: String,
    timeSlot: String,
    reason: String
    },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  status: { type: String, enum: ['pending','confirmed','rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  processedAt: Date,
  processedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  notes: String
});

export default mongoose.model('OfflineRequest', OfflineRequestSchema);
