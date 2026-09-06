import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { listEmergencies, createEmergency, assignDoctor, resolveEmergency, deleteEmergency } from '../controllers/emergencyController.js';
import { validate } from '../middleware/validate.js';
import { createEmergencyValidation, assignEmergencyValidation } from '../utils/validations/emergencyValidation.js';
const router = express.Router();
router.use(authenticateToken, authorizeRole(['admin','receptionist']))
router.get('/', listEmergencies);
router.post('/', createEmergencyValidation, validate, createEmergency);
router.put('/:id/assign', assignEmergencyValidation, validate, assignDoctor);
router.put('/:id/resolve', resolveEmergency);
router.delete('/:id', deleteEmergency);
export default router;


