import dotenv from "dotenv";
import http from 'http';
import { Server } from 'socket.io';
import { calculateNetworkQuality } from './utils/networkQuality.js';
import { findCallRoom, saveCallRoom } from './services/callRoomStore.js';
import { authenticateTeleconsultationSocket } from './middleware/auth.js';

dotenv.config({ quiet: true });

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Configure it in your .env file before starting the server.");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("FATAL: MONGO_URI is not set. Configure it in your .env file before starting the server.");
  process.exit(1);
}

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

import connectDB from "./config/db.js";
connectDB();

import app from "./app.js";

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: { origin: corsOrigins },
});
app.set('io', io);
io.use(authenticateTeleconsultationSocket);

// Socket.IO events
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', async (roomId, acknowledge) => {
    try {
      if (!roomId) throw new Error('Room ID is required');
      const call = await findCallRoom(roomId);
      if (!call) throw new Error('Call room not found');

      const userId = String(socket.user?.id || '');
      const allowed = userId === String(call.doctorId) || userId === String(call.patientId);
      if (!allowed) throw new Error('You are not a participant in this call');

      socket.join(roomId);
      socket.callRoomId = roomId;
      console.log(`${socket.id} joined room ${roomId}`);
      socket.to(roomId).emit('peer-joined', { id: socket.id });
      if (typeof acknowledge === 'function') acknowledge({ success: true, roomId });
    } catch (error) {
      if (typeof acknowledge === 'function') acknowledge({ success: false, error: error.message });
    }
  });

  socket.on('quality:update', async ({ roomId, rttMs, packetLossPercent } = {}, acknowledge) => {
    try {
      if (!roomId || socket.callRoomId !== roomId) {
        throw new Error('Socket must join the call room before updating quality');
      }

      const quality = calculateNetworkQuality({ rttMs, packetLossPercent });
      const call = await findCallRoom(roomId);
      if (!call) throw new Error('Call room not found');

      const qualityRecord = {
        tier: quality.tier,
        rttMs: quality.rttMs,
        packetLossPercent: quality.packetLossPercent,
        recordedAt: new Date(),
      };
      call.networkTier = quality.tier;
      call.currentQuality = qualityRecord;
      call.qualityHistory.push(qualityRecord);
      await saveCallRoom(call);

      io.to(roomId).emit('quality:changed', {
        callId: call._id,
        roomId,
        ...quality,
      });
      if (typeof acknowledge === 'function') acknowledge({ success: true, ...quality });
    } catch (error) {
      if (typeof acknowledge === 'function') acknowledge({ success: false, error: error.message });
    }
  });

  socket.on('offer', ({ roomId, offer, to }) => {
    if (socket.callRoomId !== roomId) return;
    socket.to(to || roomId).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ roomId, answer, to }) => {
    if (socket.callRoomId !== roomId) return;
    socket.to(to || roomId).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ roomId, candidate, to }) => {
    if (socket.callRoomId !== roomId) return;
    socket.to(to || roomId).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('leave', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('peer-left', { id: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://192.168.1.48:${PORT}`);
});
