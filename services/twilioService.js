import twilio from "twilio";

function config() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, ""),
  };
}

export function isConfigured() {
  const { accountSid, authToken, fromNumber, publicBaseUrl } = config();
  return Boolean(accountSid && authToken && fromNumber && publicBaseUrl);
}

let client = null;
function getClient() {
  const { accountSid, authToken } = config();
  if (!client) client = twilio(accountSid, authToken);
  return client;
}

function summaryText({ kind, title, severity, emergencyType }) {
  if (kind === "transport") return "You have a new non-emergency transport request from Nabha Care.";
  const what = title || emergencyType || "a medical emergency";
  return `Nabha Care dispatch: ${severity ? severity.toUpperCase() + " priority. " : ""}${what}. Press 1 to accept this ride, or 2 to decline.`;
}

// Places a real voice call to the driver with a TwiML <Gather> asking them to press
// 1/2. No-ops (logs why) instead of throwing when Twilio isn't configured, so the
// in-app accept/decline path keeps working even before real credentials exist.
export async function callDriver(driver, attempt, payload) {
  const { fromNumber, publicBaseUrl } = config();
  if (!isConfigured()) {
    console.warn(`[twilio] Not configured — skipping voice call to driver ${driver._id} for attempt ${attempt._id}`);
    return null;
  }
  try {
    const call = await getClient().calls.create({
      to: driver.phone,
      from: fromNumber,
      url: `${publicBaseUrl}/api/twilio/voice/${attempt._id}/gather`,
      statusCallback: `${publicBaseUrl}/api/twilio/voice/${attempt._id}/status`,
      statusCallbackEvent: ["completed", "no-answer", "busy", "failed"],
      timeout: Number(process.env.DISPATCH_TIMEOUT_SECONDS) || 30,
    });
    return call.sid;
  } catch (error) {
    console.error(`[twilio] Voice call failed for driver ${driver._id}:`, error.message);
    return null;
  }
}

export async function smsDriver(driver, attempt, payload) {
  const { fromNumber } = config();
  if (!isConfigured()) {
    console.warn(`[twilio] Not configured — skipping SMS to driver ${driver._id} for attempt ${attempt._id}`);
    return null;
  }
  try {
    const sms = await getClient().messages.create({
      to: driver.phone,
      from: fromNumber,
      body: `${summaryText(payload)} Reply YES to accept or NO to decline.`,
    });
    return sms.sid;
  } catch (error) {
    console.error(`[twilio] SMS failed for driver ${driver._id}:`, error.message);
    return null;
  }
}

export function validateSignature(req) {
  const { authToken } = config();
  if (!authToken) return true; // nothing to validate against when unconfigured
  const signature = req.headers["x-twilio-signature"];
  const { publicBaseUrl } = config();
  const url = `${publicBaseUrl}${req.originalUrl}`;
  return twilio.validateRequest(authToken, signature, url, req.body);
}

export { summaryText };
