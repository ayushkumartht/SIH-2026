// utils/smsParser.js

// A very simple parser – extend this logic as per your SMS formats
export function parseSmsToBooking(text) {
  const lower = text.toLowerCase();

  // Extract doctorId (assumes "dr.<id>" or "doctor <id>")
  const doctorMatch = lower.match(/dr\.?(\d+)/) || lower.match(/doctor\s+(\d+)/);
  const doctorId = doctorMatch ? doctorMatch[1] : null;

  // Extract date (YYYY-MM-DD or DD/MM/YYYY for now)
  const dateMatch = lower.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
  const date = dateMatch ? dateMatch[0] : null;

  // Extract time slot (hh:mm or hham/pm)
  const timeMatch = lower.match(/(\d{1,2}(:\d{2})?\s?(am|pm)?)/);
  const timeSlot = timeMatch ? timeMatch[0] : null;

  return {
    doctorId,
    date,
    timeSlot,
    type: 'in-person', // default for now
    raw: text
  };
}
