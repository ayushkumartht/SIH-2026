import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { listHospitals } from '../controllers/hospitalController.js';

const router = express.Router();
router.use(authenticateToken);
router.get('/', listHospitals);

export default router;
