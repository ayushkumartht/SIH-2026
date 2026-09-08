import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  listEmergencies,
  createEmergency,
  suggestAmbulances,
  assignVehicle,
  updateDispatchStatus,
  assignDoctor,
  acknowledgeEmergency,
  resolveEmergency,
  deleteEmergency,
  getDispatchLog,
} from '../controllers/emergencyController.js';
import { validate } from '../middleware/validate.js';
import {
  createEmergencyValidation,
  assignEmergencyValidation,
  assignVehicleValidation,
  updateDispatchStatusValidation,
} from '../utils/validations/emergencyValidation.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', authorizeRole(['admin', 'receptionist', 'doctor', 'patient', 'asha']), listEmergencies);
router.post('/', authorizeRole(['patient', 'asha', 'doctor']), createEmergencyValidation, validate, createEmergency);

router.get('/:id/suggest-ambulances', authorizeRole(['admin', 'receptionist', 'doctor']), suggestAmbulances);
router.get('/:id/dispatch-log', authorizeRole(['admin', 'receptionist', 'doctor']), getDispatchLog);
router.put('/:id/assign-vehicle', authorizeRole(['admin', 'receptionist']), assignVehicleValidation, validate, assignVehicle);
router.put('/:id/status', authorizeRole(['admin', 'receptionist']), updateDispatchStatusValidation, validate, updateDispatchStatus);
router.put('/:id/assign', authorizeRole(['admin', 'receptionist']), assignEmergencyValidation, validate, assignDoctor);
router.put('/:id/acknowledge', authorizeRole(['doctor']), acknowledgeEmergency);
router.put('/:id/resolve', authorizeRole(['admin', 'receptionist', 'doctor']), resolveEmergency);
router.delete('/:id', authorizeRole(['admin']), deleteEmergency);

export default router;
