import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { assignAshaToCall, getAshaDashboard, recordAshaVitals, registerAshaPatient, updateAshaPatientLocation } from '../controllers/ashaController.js';

const router = express.Router();
router.use(authenticateToken, authorizeRole(['asha']));
router.get('/dashboard', getAshaDashboard);
router.post('/patients', registerAshaPatient);
router.patch('/patients/:patientId/location', updateAshaPatientLocation);
router.post('/consultations/:consultationId/vitals', recordAshaVitals);
router.post('/calls/:callId/assist', assignAshaToCall);
export default router;
