import twilio from 'twilio';
import DispatchAttempt from '../models/DispatchAttempt.js';
import Driver from '../models/Driver.js';
import { respondToDispatch } from '../services/dispatchEngine.js';
import { validateSignature } from '../services/twilioService.js';

const { VoiceResponse } = twilio.twiml;
const { MessagingResponse } = twilio.twiml;

function normalizePhone(p) {
  return (p || '').replace(/\D/g, '').slice(-10);
}

// Twilio requests this URL twice per call: once when the call connects (no
// Digits yet — we read out the offer and <Gather> a keypress), and once more
// after the driver presses a digit (action posts back to this same URL).
export const voiceGather = async (req, res) => {
  res.type('text/xml');
  if (!validateSignature(req)) return res.status(403).send('Invalid signature');

  const { attemptId } = req.params;
  const digit = req.body.Digits;
  const response = new VoiceResponse();

  if (!digit) {
    const attempt = await DispatchAttempt.findById(attemptId);
    const distanceText = attempt?.distanceKm != null ? ` It is approximately ${attempt.distanceKm} kilometers away.` : '';
    const gather = response.gather({ numDigits: 1, action: `/api/twilio/voice/${attemptId}/gather`, method: 'POST', timeout: 10 });
    gather.say(`This is Nabha Care dispatch with a new ride request.${distanceText} Press 1 to accept, or 2 to decline.`);
    response.say('We did not receive a response. Goodbye.');
    return res.send(response.toString());
  }

  const decision = digit === '1' ? 'accept' : 'decline';
  const result = await respondToDispatch(attemptId, decision, 'call');
  response.say(
    !result.ok
      ? 'This request is no longer available.'
      : decision === 'accept'
        ? 'You have accepted this ride. Thank you.'
        : 'You have declined this ride. Thank you.',
  );
  response.hangup();
  res.send(response.toString());
};

// Twilio's call status callback (completed/no-answer/busy/failed). We don't
// need to act on it — the dispatch timeout already handles a driver who never
// picks up — but we must return 200 or Twilio will keep retrying.
export const voiceStatus = (req, res) => {
  if (!validateSignature(req)) return res.status(403).end();
  res.status(200).end();
};

export const smsInbound = async (req, res) => {
  res.type('text/xml');
  if (!validateSignature(req)) return res.status(403).send('Invalid signature');

  const from = req.body.From;
  const body = (req.body.Body || '').trim().toLowerCase();
  const decision = body.startsWith('y') ? 'accept' : body.startsWith('n') ? 'decline' : null;
  const response = new MessagingResponse();

  if (!decision) {
    response.message('Reply YES to accept or NO to decline the ride request.');
    return res.send(response.toString());
  }

  const last10 = normalizePhone(from);
  const drivers = await Driver.find();
  const driver = drivers.find((d) => normalizePhone(d.phone) === last10);
  if (!driver) {
    response.message('We could not match this number to a registered driver.');
    return res.send(response.toString());
  }

  const attempt = await DispatchAttempt.findOne({ driver: driver._id, status: 'ringing' }).sort({ createdAt: -1 });
  if (!attempt) {
    response.message('No active dispatch request found for you.');
    return res.send(response.toString());
  }

  const result = await respondToDispatch(attempt._id, decision, 'sms');
  response.message(!result.ok ? 'This request is no longer available.' : decision === 'accept' ? 'Accepted. Thank you.' : 'Declined. Thank you.');
  res.send(response.toString());
};
