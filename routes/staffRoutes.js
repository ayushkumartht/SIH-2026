import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { listStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';
import { validate } from '../middleware/validate.js';
import { createStaffValidation, updateStaffValidation } from '../utils/validations/staffValidation.js';
const router = express.Router();
router.use(authenticateToken, authorizeRole(['admin']));
router.get('/', listStaff);
router.post('/', createStaffValidation, validate, createStaff);
router.put('/:id', updateStaffValidation, validate, updateStaff);
router.delete('/:id', deleteStaff);
export default router;


