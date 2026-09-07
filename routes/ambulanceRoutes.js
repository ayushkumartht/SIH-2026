import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  listAmbulances,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance,
  listDrivers,
  createDriver,
  updateDriver,
} from '../controllers/ambulanceController.js';

const router = express.Router();
router.use(authenticateToken, authorizeRole(['admin', 'receptionist']));

router.get('/drivers', listDrivers);
router.post('/drivers', createDriver);
router.put('/drivers/:id', updateDriver);

router.get('/', listAmbulances);
router.post('/', createAmbulance);
router.put('/:id', updateAmbulance);
router.delete('/:id', deleteAmbulance);

export default router;
