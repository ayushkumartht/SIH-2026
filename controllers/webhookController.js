// controllers/webhookController.js
import OfflineRequest from '../models/OfflineRequest.js';
import { parseSmsToBooking } from '../utils/smsParser.js';
import { sendSms } from '../utils/smsSender.js';
import { tryLockAndBook, getAvailableSlots } from '../services/appointmentService.js';

export async function smsWebhook(req, res, next) {
  try {
    const raw = req.body; 
    const text = raw.Body || raw.message || raw.text;
    const from = raw.From || raw.from;
    const parsed = parseSmsToBooking(text);

    const offline = await OfflineRequest.create({
      source: 'sms',
      rawMessage: text,
      parsed
    });

    if (parsed.date && parsed.timeSlot && parsed.doctorId) {
      try {
        const appt = await tryLockAndBook({
          patientId: req.patientId,
          doctorId: parsed.doctorId,
          date: parsed.date,
          timeSlot: parsed.timeSlot,
          type: parsed.type || 'in-person'
        });
        offline.status = 'confirmed';
        offline.processedAt = new Date();
        await offline.save();
        await sendSms(from, `Booking confirmed for ${parsed.date} ${parsed.timeSlot}.`);
        const io = req.app.get('io'); io && io.emit('offline_booking_confirmed', { offline, appt });
      } catch (err) {
        const avail = await getAvailableSlots(parsed.doctorId, parsed.date);
        await sendSms(from, `Could not book requested slot. Next available: ${avail.slice(0,3).join(', ')}`);
      }
    } else {
      await sendSms(from, `We received your booking request. Hospital staff will confirm shortly.`);
    }

    return res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}
