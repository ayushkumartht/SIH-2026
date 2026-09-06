import express from 'express';
import { respondOfflineRequest } from '../controllers/offlineRequestController.js';
import { smsWebhook } from '../controllers/webhookController.js';
const router = express.Router();

router.post('/api/webhooks/sms', smsWebhook);
router.post('/:id/respond', respondOfflineRequest);

export default router;
