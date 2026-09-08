import express from 'express';
import { voiceGather, voiceStatus, smsInbound } from '../controllers/twilioWebhookController.js';

// No authenticateToken here — Twilio calls these directly from the internet.
// Each handler validates the request came from Twilio via validateSignature().
const router = express.Router();

router.post('/voice/:attemptId/gather', voiceGather);
router.post('/voice/:attemptId/status', voiceStatus);
router.post('/sms/inbound', smsInbound);

export default router;
