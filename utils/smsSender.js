import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://api.textbee.dev/api/v1';
const API_KEY = process.env.TEXTBEE_API_KEY;
const DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

export async function sendSms(to, message) {
  try {
    const response = await axios.post(
      `${BASE_URL}/gateway/devices/${DEVICE_ID}/send-sms`,
      { recipients: [to], message },
      { headers: { 'x-api-key': API_KEY } }
    );
    return response.data;
  } catch (err) {
    console.error('SMS API Error:', err.response?.data || err.message);
    throw new Error('Failed to send SMS');
  }
}
