import mongoose from "mongoose";
import CallRoom from "../models/CallRoom.js";

export async function createCallRoom(data) {
  return CallRoom.create(data);
}

export async function findCallRoom(callId) {
  if (mongoose.Types.ObjectId.isValid(callId)) {
    const byId = await CallRoom.findById(callId);
    if (byId) return byId;
  }
  return CallRoom.findOne({ roomId: callId });
}

export async function saveCallRoom(room) {
  return room.save();
}

export async function findActiveRoomForAppointment(appointmentId) {
  return CallRoom.findOne({ appointmentId: String(appointmentId), status: 'active' }).sort({ createdAt: -1 });
}
