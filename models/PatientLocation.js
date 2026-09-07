import mongoose from 'mongoose';

const PatientLocationSchema = new mongoose.Schema({
  consultationId: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  accuracyMeters: { type: Number, min: 0 },
  consentedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export default mongoose.models.PatientLocation || mongoose.model('PatientLocation', PatientLocationSchema);
