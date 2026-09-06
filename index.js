import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http  from 'http';
import { Server } from 'socket.io';
import { calculateNetworkQuality } from './utils/networkQuality.js';
import { findCallRoom, saveCallRoom } from './services/callRoomStore.js';
import { authenticateTeleconsultationSocket } from './middleware/auth.js';

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());

import connectDB from "./config/db.js";
if (process.env.DEMO_MODE === "true") {
  console.log("Demo mode enabled: MongoDB is bypassed for teleconsultation testing");
} else {
  connectDB();
}

import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js"
import offlineRequestRoute from "./routes/offlineRequestRoute.js"
import labDoctorRoutes from "./routes/labDoctorRoutes.js"

app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/lab-doctors", labDoctorRoutes);
app.use("/offline-requests", offlineRequestRoute);


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Create Socket.IO server
const io = new Server(server, {
  cors: { origin: '*' }, // allow RN app to connect
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

      const isDemo = process.env.DEMO_MODE === 'true';
      const userId = String(socket.user?.id || '');
      const allowed = isDemo || userId === String(call.doctorId) || userId === String(call.patientId);
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