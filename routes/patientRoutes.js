import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { listPatients, getPatient, createPatient, updatePatient, deletePatient } from '../controllers/patientController.js';
import { validate } from '../middleware/validate.js';
import { createPatientValidation, updatePatientValidation } from '../utils/validations/patientValidation.js';
const router = express.Router();
router.use(authenticateToken, authorizeRole(['admin','receptionist']));
router.get('/', listPatients);
router.get('/:id', getPatient);
router.post('/', createPatientValidation, validate, createPatient);
router.put('/:id', updatePatientValidation, validate, updatePatient);
router.delete('/:id', deletePatient);
export default router;


