import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { createAppointment, listAppointments, updateAppointment, deleteAppointment, checkAvailability } from '../controllers/appointmentController.js';
import { validate } from '../middleware/validate.js';
import { createAppointmentValidation, updateAppointmentValidation, checkAvailabilityValidation } from '../utils/validations/appointmentValidation.js';
const router = express.Router();
router.use(authenticateToken, authorizeRole(['admin','receptionist']));
router.post('/', createAppointmentValidation, validate, createAppointment);
router.get('/', listAppointments);
router.put('/:id', updateAppointmentValidation, validate, updateAppointment);
router.delete('/:id', deleteAppointment);
router.get('/availability', checkAvailabilityValidation, validate, checkAvailability);
export default router;


