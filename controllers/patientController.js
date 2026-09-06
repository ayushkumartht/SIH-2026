import Patient from '../models/patient.js';

export const listPatients = async (req, res, next) => {
  try {
    const { name, age } = req.query;
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (age) filter.age = Number(age);
    const patients = await Patient.find(filter).populate('doctor');
    res.json({ success: true, data: patients });
  } catch (e) { next(e); }
};

export const getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('doctor');
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found', statusCode: 404 });
    res.json({ success: true, data: patient });
  } catch (e) { next(e); }
};

export const createPatient = async (req, res, next) => {
  try {
    const patient = await Patient.create(req.body);
    res.status(201).json({ success: true, data: patient });
  } catch (e) { next(e); }
};

export const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found', statusCode: 404 });
    res.json({ success: true, data: patient });
  } catch (e) { next(e); }
};

export const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found', statusCode: 404 });
    res.json({ success: true, data: null });
  } catch (e) { next(e); }
};


