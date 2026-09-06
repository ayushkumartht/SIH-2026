import mongoose from "mongoose";
import CallRoom from "../models/CallRoom.js";

const demoRooms = new Map();

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function createDemoRoom(data) {
  const now = new Date();
  return {
    ...data,
    _id: `demo-${new mongoose.Types.ObjectId().toString()}`,
    qualityHistory: data.qualityHistory || [],
    vitals: data.vitals || [],
    status: data.status || "active",
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export async function createCallRoom(data) {
  if (!isDemoMode()) return CallRoom.create(data);

  const room = createDemoRoom(data);
  demoRooms.set(room.roomId, room);
  return room;
}

export async function findCallRoom(callId) {
  if (isDemoMode()) {
    for (const room of demoRooms.values()) {
      if (room.roomId === callId || room._id === callId) return room;
    }
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(callId)) {
    const byId = await CallRoom.findById(callId);
    if (byId) return byId;
  }
  return CallRoom.findOne({ roomId: callId });
}

export async function saveCallRoom(room) {
  if (isDemoMode()) {
    room.updatedAt = new Date();
    demoRooms.set(room.roomId, room);
    return room;
  }
  return room.save();
}