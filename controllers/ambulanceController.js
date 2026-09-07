import Ambulance from '../models/Ambulance.js';
import Driver from '../models/Driver.js';

export const listAmbulances = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const items = await Ambulance.find(filter).populate('driver').populate('hospitalId', 'name');
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const createAmbulance = async (req, res, next) => {
  try {
    const { vehicleNumber, type, hospitalId, capacity, currentLocation, driver } = req.body;
    if (!vehicleNumber) return res.status(400).json({ success: false, error: 'vehicleNumber is required', statusCode: 400 });

    let driverId = driver?.id || null;
    if (!driverId && driver?.name && driver?.phone && driver?.licenseNo) {
      const created = await Driver.create({ name: driver.name, phone: driver.phone, licenseNo: driver.licenseNo });
      driverId = created._id;
    }

    const ambulance = await Ambulance.create({ vehicleNumber, type, hospitalId: hospitalId || null, capacity, currentLocation, driver: driverId });
    res.status(201).json({ success: true, data: ambulance });
  } catch (e) { next(e); }
};

export const updateAmbulance = async (req, res, next) => {
  try {
    const updated = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('driver');
    if (!updated) return res.status(404).json({ success: false, error: 'Ambulance not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const deleteAmbulance = async (req, res, next) => {
  try {
    const deleted = await Ambulance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Ambulance not found', statusCode: 404 });
    res.json({ success: true, data: null });
  } catch (e) { next(e); }
};

export const listDrivers = async (req, res, next) => {
  try {
    const items = await Driver.find();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const createDriver = async (req, res, next) => {
  try {
    const { name, phone, licenseNo } = req.body;
    if (!name || !phone || !licenseNo) return res.status(400).json({ success: false, error: 'name, phone and licenseNo are required', statusCode: 400 });
    const driver = await Driver.create({ name, phone, licenseNo });
    res.status(201).json({ success: true, data: driver });
  } catch (e) { next(e); }
};

export const updateDriver = async (req, res, next) => {
  try {
    const updated = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Driver not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};
