import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { getMyProfile, updateMyStatus, respondToJob, updateJobStatus } from '../controllers/driverController.js';

const router = express.Router();
router.use(authenticateToken, authorizeRole(['driver']));

router.get('/me', getMyProfile);
router.put('/me/status', updateMyStatus);
router.post('/jobs/:attemptId/respond', respondToJob);
router.put('/jobs/:kind/:requestId/status', updateJobStatus);

export default router;
