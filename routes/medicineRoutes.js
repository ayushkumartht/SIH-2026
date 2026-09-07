import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { listMedicines, createMedicine, updateMedicine, deleteMedicine } from '../controllers/medicineController.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', listMedicines);
router.post('/', authorizeRole(['admin', 'receptionist']), createMedicine);
router.put('/:id', authorizeRole(['admin', 'receptionist']), updateMedicine);
router.delete('/:id', authorizeRole(['admin']), deleteMedicine);

export default router;
