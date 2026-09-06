import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
 
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  doctorId: String,
  date: Date,
  time: String,
  reason: String,
  appointmentType: String,
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
  bookingMode: {
    type: String,
    enum: ["online", "offline"],
    default: "online",
  },
  createdAt: Date,
});

export default mongoose.model("Appointment", AppointmentSchema);