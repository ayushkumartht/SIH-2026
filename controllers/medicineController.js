import Medicine from '../models/Medicine.js';

export const listMedicines = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.hospital) filter.hospital = req.query.hospital;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
    const items = await Medicine.find(filter).populate('hospital', 'name city').sort({ name: 1 });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const createMedicine = async (req, res, next) => {
  try {
    const { name, hospital, category, unit, stockQuantity, lowStockThreshold } = req.body;
    if (!name || !hospital) return res.status(400).json({ success: false, error: 'name and hospital are required', statusCode: 400 });
    const created = await Medicine.create({ name, hospital, category, unit, stockQuantity, lowStockThreshold });
    res.status(201).json({ success: true, data: created });
  } catch (e) { next(e); }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.stockQuantity !== undefined) update.lastRestockedAt = new Date();
    const updated = await Medicine.findByIdAndUpdate(req.params.id, update, { new: true }).populate('hospital', 'name city');
    if (!updated) return res.status(404).json({ success: false, error: 'Medicine not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Medicine not found', statusCode: 404 });
    res.json({ success: true, data: null });
  } catch (e) { next(e); }
};
