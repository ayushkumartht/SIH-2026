import Appointment from '../models/Appointment.js';
import { ensureDoctorAvailable, getAvailableSlots } from '../services/appointmentService.js';

export const createAppointment = async (req, res, next) => {
  try {
    const { patient, doctorId, date, time, appointmentType } = req.body;
    await ensureDoctorAvailable(doctorId, date, time);

    const created = await Appointment.create({
      patient,
      doctorId,
      date,
      time,
      appointmentType,
      status: 'confirmed'
    });

    res.status(201).json({ success: true, data: created });
  } catch (e) { next(e); }
};

export const listAppointments = async (req, res, next) => {
  try {
    const { doctorId, patient } = req.query;
    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (patient) filter.patient = patient;

    const items = await Appointment.find(filter).populate('doctorId').populate('patient');
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time } = req.body;
    if (doctorId && date && time) {
      await ensureDoctorAvailable(doctorId, date, time);
    }

    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Appointment not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Appointment not found', statusCode: 404 });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const checkAvailability = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;
    const slots = await getAvailableSlots(doctorId, date);
    res.json({ success: true, data: slots });
  } catch (e) { next(e); }
};
