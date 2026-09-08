import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { createTransportRequest, listTransportRequests, cancelTransportRequest, getDispatchLog } from '../controllers/transportController.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/', authorizeRole(['patient']), createTransportRequest);
router.get('/', authorizeRole(['patient', 'admin', 'receptionist', 'driver']), listTransportRequests);
router.put('/:id/cancel', authorizeRole(['patient', 'admin', 'receptionist']), cancelTransportRequest);
router.get('/:id/dispatch-log', authorizeRole(['admin', 'receptionist']), getDispatchLog);

export default router;
