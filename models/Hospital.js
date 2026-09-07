import mongoose from 'mongoose';

const HospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, default: 'Punjab' },
  pincode: { type: String },
  contact: { type: String },
  email: { type: String },
  type: {
    type: String,
    enum: ['government', 'private', 'chc', 'phc', 'district', 'sub-district'],
    default: 'government',
  },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  facilities: [{ type: String }],
  beds: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Geospatial index for nearby queries
HospitalSchema.index({ latitude: 1, longitude: 1 });

export default mongoose.models.Hospital || mongoose.model('Hospital', HospitalSchema);
