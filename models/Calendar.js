const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String }, 
  description: { type: String }, 
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, 
  type: { type: String, enum: ["appointment", "surgery", "meeting", "other"], default: "appointment" },
});

const dayScheduleSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["available", "busy", "onDuty", "offDuty"], 
    default: "available" 
  }, 
  slots: [
    {
      hour: { type: String, required: true }, 
      tasks: [taskSchema] 
    }
  ],
});

const calendarSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  schedules: [dayScheduleSchema], 
});

const Calendar = mongoose.model("Calendar", calendarSchema);
module.exports = Calendar;
