import axios from 'axios';
import { resolveInitialNetworkQuality } from '../utils/networkQuality.js';
import { createCallRoom, findCallRoom, isDemoMode } from '../services/callRoomStore.js';
import { createConsultation, saveConsultation } from '../services/consultationStore.js';

// Create a Daily.co room
const createDailyRoom = async (req, res) => {
  try {
    const { patientId, doctorId, networkTier, rttMs, packetLossPercent } = req.body;

    // Validate required parameters
    if (!patientId || !doctorId) {
      return res.status(400).json({
        success: false,
        error: 'patientId and doctorId are required'
      });
    }

    // Daily.co API configuration
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    const DAILY_API_URL = 'https://api.daily.co/v1/rooms';

    if (!DAILY_API_KEY && !isDemoMode()) {
      return res.status(500).json({
        success: false,
        error: 'Daily API key is missing'
      });
    }

    const quality = resolveInitialNetworkQuality({ networkTier, rttMs, packetLossPercent });

    if (isDemoMode()) {
      const roomName = `demo-consultation-${Date.now()}`;
      const roomUrl = `demo://${roomName}`;
      const consultation = await createConsultation({ patientId, doctorId, consent: { granted: req.body.consent === true, grantedAt: req.body.consent === true ? new Date() : undefined, grantedBy: req.user?.id || "demo" } });
      const callRoom = await createCallRoom({
        roomId: roomUrl,
        doctorId,
        patientId,
        consultationId: consultation._id,
        mode: 'daily',
        networkTier: quality.tier,
        currentQuality: {
          tier: quality.tier,
          rttMs: quality.rttMs,
          packetLossPercent: quality.packetLossPercent,
        },
      });
      consultation.callRoom = callRoom._id;
      await saveConsultation(consultation);
      return res.status(200).json({
        success: true,
        demo: true,
        roomUrl,
        roomId: roomUrl,
        roomName,
        consultationId: consultation._id,
        networkTier: quality.tier,
        mediaProfile: quality,
      });
    }

    // Create room configuration
    const roomConfig = {
      name: `consultation-${doctorId}-${patientId}-${Date.now()}`,
      privacy: 'private',
      properties: {
        enable_chat: true,
        enable_knocking: false,
        enable_prejoin_ui: true,
        start_video_off: !quality.videoEnabled,
        start_audio_off: false,
        enable_people_ui: true,
        max_video_quality: quality.maxVideoQuality,
      }
    };

    // Make API request to Daily.co
    const response = await axios.post(DAILY_API_URL, roomConfig, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });

    const room = response.data;
    const roomDomain = process.env.DAILY_DOMAIN || 'medkit.daily.co';
    const roomUrl = `https://${roomDomain}/${room.name}`;

    const consultation = await createConsultation({ patientId, doctorId, consent: { granted: req.body.consent === true, grantedAt: req.body.consent === true ? new Date() : undefined, grantedBy: req.user?.id || "demo" } });

    // Store room information in database
    const callRoom = await createCallRoom({
      roomId: roomUrl,
      doctorId: doctorId,
      patientId: patientId,
      consultationId: consultation._id,
      mode: 'daily',
      networkTier: quality.tier,
      currentQuality: {
        tier: quality.tier,
        rttMs: quality.rttMs,
        packetLossPercent: quality.packetLossPercent,
      },
      createdAt: new Date()
    });
    consultation.callRoom = callRoom._id;
    await saveConsultation(consultation);


    // Return room information
    res.status(200).json({
      success: true,
      roomUrl: roomUrl,
      roomId: room.id,
      roomName: room.name,
      consultationId: consultation._id,
      networkTier: quality.tier,
      mediaProfile: quality,
      config: roomConfig
    });
  } catch (error) {
    console.error('Error creating Daily.co room:', error.response?.data || error.message);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || 'Failed to create video call room'
      });
    } else if (error.request) {
      res.status(500).json({
        success: false,
        error: 'Network error - unable to reach Daily.co API'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create video call room'
      });
    }
  }
};

const createDailyToken = async (req, res) => {
  try {
    const { roomName } = req.params;
    const userId = String(req.user?.id || '');
    const roomDomain = process.env.DAILY_DOMAIN || 'medkit.daily.co';
    const call = await findCallRoom(`https://${roomDomain}/${roomName}`);
    if (!call) return res.status(404).json({ success: false, error: 'Call room not found' });

    if (userId !== String(call.doctorId) && userId !== String(call.patientId)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this call' });
    }

    const response = await axios.post('https://api.daily.co/v1/meeting-tokens', {
      properties: {
        room_name: roomName,
        user_name: req.user.email || userId,
        user_id: userId,
        is_owner: userId === String(call.doctorId),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      },
    });

    return res.json({ success: true, token: response.data.token, expiresIn: 3600 });
  } catch (error) {
    console.error('Error creating Daily meeting token:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || 'Failed to create Daily meeting token',
    });
  }
};

// Get room information
const getDailyRoom = async (req, res) => {
  try {
    const { roomName } = req.params;
    
    if (!roomName) {
      return res.status(400).json({
        success: false,
        error: 'roomName is required'
      });
    }
    
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    const DAILY_API_URL = `https://api.daily.co/v1/rooms/${roomName}`;
    
    const response = await axios.get(DAILY_API_URL, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    res.status(200).json({
      success: true,
      room: response.data
    });
  } catch (error) {
    console.error('Error getting Daily.co room:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || 'Failed to get room information'
      });
    } else if (error.request) {
      res.status(500).json({
        success: false,
        error: 'Network error - unable to reach Daily.co API'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get room information'
      });
    }
  }
};

// Delete a room
const deleteDailyRoom = async (req, res) => {
  try {
    const { roomName } = req.params;
    
    if (!roomName) {
      return res.status(400).json({
        success: false,
        error: 'roomName is required'
      });
    }
    
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    const DAILY_API_URL = `https://api.daily.co/v1/rooms/${roomName}`;
    
    await axios.delete(DAILY_API_URL, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Daily.co room:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || 'Failed to delete room'
      });
    } else if (error.request) {
      res.status(500).json({
        success: false,
        error: 'Network error - unable to reach Daily.co API'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete room'
      });
    }
  }
};

export {
  createDailyRoom,
  createDailyToken,
  getDailyRoom,
  deleteDailyRoom
};