import Hospital from '../models/Hospital.js';

export const listHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ isActive: true }).select('name city type').sort({ name: 1 });
    res.json({ success: true, data: hospitals });
  } catch (e) { next(e); }
};
