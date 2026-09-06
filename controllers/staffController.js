import bcrypt from 'bcryptjs';
import Staff from '../models/Staff.js';

export const listStaff = async (req, res, next) => {
  try {
    const items = await Staff.find();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const createStaff = async (req, res, next) => {
  try {
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const created = await Staff.create({ ...req.body, password: hash });
    res.status(201).json({ success: true, data: { 
      id: created._id,
      name: created.name,
      email: created.email,
      role: created.role,
      createdAt: created.createdAt
    } });
  } catch (e) { next(e); }
};

export const updateStaff = async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    }
    const updated = await Staff.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Staff not found', statusCode: 404 });
    res.json({ success: true, data: { 
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt
    } });
  } catch (e) { next(e); }
};

export const deleteStaff = async (req, res, next) => {
  try {
    const deleted = await Staff.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Staff not found', statusCode: 404 });
    res.json({ success: true, data: null });
  } catch (e) { next(e); }
};