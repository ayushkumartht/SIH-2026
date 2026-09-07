import Doctor from "../models/doctor.js";
import Patient from "../models/patient.js";
import Emergency from "../models/Emergency.js";
import Report from "../models/Report.js";
import LabReport from "../models/labReport.js";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { resolveInitialNetworkQuality } from "../utils/networkQuality.js";
import { createCallRoom } from "../services/callRoomStore.js";
import { createConsultation, saveConsultation } from "../services/consultationStore.js";

const addDoctor = async (req, res) => {
  try {
    const { name, mobile, specialization, availability, status } = req.body;
    const existingDoctor = await Doctor.findOne({ mobile });
    if (existingDoctor) {
      return res.status(400).json({ 
        success: false,
        message: "Doctor with this mobile already exists" 
      });
    }

    const doctor = new Doctor({
      name,
      mobile,
      specialization,
      availability,
      status,
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding doctor",
      error: error.message,
    });
  }
};

const addReportToPatient = async (req, res) => {
  try {
    const { doctorId, patientId } = req.params;
    const { title, content } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const files = req.files ? req.files.map(file => `${process.env.BACKEND_URL}/uploads/${file.filename}`) : [];

    const report = new LabReport({
      title,
      content,
      doctor: doctorId,
      patient: patientId,
      uploadedBy: doctorId,
      uploadedByRole: "Doctor",
      files,
    });

    await report.save();

    patient.reports.push(report._id);
    await patient.save();

    res.status(201).json({ message: "Report added successfully", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId)
      .populate({
        path: "patients",
        populate: {
          path: "reports",
          model: "LabReport", 
          select: "title content files uploadedBy uploadedByRole createdAt updatedAt"
        }
      });

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.json({ doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addPatientToDoctor = async (req, res) => {
  try {
    const doctor = req.doctor;
    const doctorId = req.doctorId;
    const { name, age, gender, contact, history } = req.body;

    const patient = new Patient({
      name,
      age,
      gender,
      contact,
      history,
      doctor: doctorId,
    });
    await patient.save();

    doctor.patients.push(patient._id);
    await doctor.save();

    res.status(201).json({ 
      success: true,
      message: "Patient added successfully", 
      patient 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

const addDoctorSchedule = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { date, slots } = req.body; 
    let calendarDay = doctor.calendar.find(
      (day) => day.date.toISOString().split("T")[0] === new Date(date).toISOString().split("T")[0]
    );

    if (calendarDay) {
      calendarDay.slots.push(...slots.map((s) => ({ ...s, status: "free" })));
    } else {
      doctor.calendar.push({
        date,
        slots: slots.map((s) => ({ ...s, status: "free" })),
      });
    }

    await doctor.save();

    res.status(201).json({
      success: true,
      message: "Schedule added successfully",
      doctor,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};


const attendEmergency = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { emergencyId } = req.params;

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ 
        success: false,
        message: "Emergency not found" 
      });
    }

    emergency.status = "resolved";
    await emergency.save();

    if (!doctor.emergencies.includes(emergency._id)) {
      doctor.emergencies.push(emergency._id);
      await doctor.save();
    }

    res.status(200).json({
      success: true,
      message: "Emergency attended successfully",
      emergency,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};


export const upsertCalendarSlot = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, time, status, patientId } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    let calendarDay = doctor.calendar.find(
      (entry) => entry.date.toDateString() === new Date(date).toDateString()
    );

    if (!calendarDay) {
      calendarDay = {
        date: new Date(date),
        slots: [
          {
            time,
            status: status || "free",
            patient: patientId ? new mongoose.Types.ObjectId(patientId) : null,
          },
        ],
      };
      console.log("Creating new calendar day");
      doctor.calendar.push(calendarDay);
    } else {
      console.log("Creating new calendar eday");

      let slot = calendarDay.slots.find((s) => s.time === time);

      if (!slot) {
        calendarDay.slots.push({
          time,
          status: status || "free",
          patient: patientId ? new mongoose.Types.ObjectId(patientId) : null,
        });
      } else {
        slot.status = status || slot.status;
        slot.patient = patientId ? new mongoose.Types.ObjectId(patientId) : slot.patient;
      }
    }

    await doctor.save();

    res.status(200).json({
      message: "Calendar updated successfully",
      calendar: doctor.calendar,
    });
  } catch (error) {
    console.error("Error updating calendar:", error);
    res.status(500).json({ message: "Server error" });
      console.log("Creating new calendar day1");

  }
};

export const addEmergency = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { patientId, title, details, priority } = req.body;

    const emergency = new Emergency({
      patient: patientId,
      doctor: doctorId,
      title,
      details,
      priority,
    });

    await emergency.save();

    await Doctor.findByIdAndUpdate(doctorId, {
      $push: { emergencies: emergency._id },
    });

    res.status(201).json({
      success: true,
      message: "Emergency created successfully",
      emergency,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoctorEmergencies = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const emergencies = await Emergency.find({ doctor: doctorId })
      .populate("patient", "name age gender contact")
      .sort({ createdAt: -1 });

    res.json({ success: true, emergencies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmergency = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { doctorNote, priority } = req.body;

    const emergency = await Emergency.findByIdAndUpdate(
      emergencyId,
      { doctorNote, priority },
      { new: true }
    );

    res.json({
      success: true,
      message: "Emergency updated successfully",
      emergency,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgeEmergency = async (req, res) => {
  try {
    const { emergencyId } = req.params;

    const emergency = await Emergency.findByIdAndUpdate(
      emergencyId,
      { acknowledged: true },
      { new: true }
    );

    res.json({
      success: true,
      message: "Emergency acknowledged",
      emergency,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const createRoom = async (req, res) => {
  try {
    const { doctorId, patientId, networkTier, rttMs, packetLossPercent } = req.body;

    if (!doctorId || !patientId) {
      return res.status(400).json({ message: "doctorId and patientId are required" });
    }

    if (process.env.DEMO_MODE !== "true") {
      const actorId = String(req.user?.id || "");
      const actorRole = req.user?.role;
      if ((actorRole === "doctor" && actorId !== String(doctorId)) || (actorRole === "patient" && actorId !== String(patientId))) {
        return res.status(403).json({ message: "You can only create a room for your own consultation" });
      }
      if (!['doctor', 'patient'].includes(actorRole)) {
        return res.status(403).json({ message: "Only a doctor or patient can create a consultation room" });
      }
    }

    const roomId = uuidv4();
    const quality = resolveInitialNetworkQuality({ networkTier, rttMs, packetLossPercent });
    const consultation = await createConsultation({ patientId, doctorId, consent: { granted: req.body.consent === true, grantedAt: req.body.consent === true ? new Date() : undefined, grantedBy: req.user?.id || "demo" } });

    const room = await createCallRoom({
      roomId,
      doctorId,
      patientId,
      consultationId: consultation._id,
      mode: "webrtc",
      networkTier: quality.tier,
      currentQuality: {
        tier: quality.tier,
        rttMs: quality.rttMs,
        packetLossPercent: quality.packetLossPercent,
      },
    });
    consultation.callRoom = room._id;
    await saveConsultation(consultation);

    res.status(201).json({
      message: "Room created successfully",
      roomId: room.roomId,
      doctorId: room.doctorId,
      patientId: room.patientId,
      consultationId: consultation._id,
      networkTier: quality.tier,
      mediaProfile: quality,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server error while creating room" });
  }
};

export const addPatient = async (req, res) => {
  try {
    const { name, age, gender, contact, history, doctorId } = req.body;

    const patient = new Patient({
      name,
      age,
      gender,
      contact,
      history,
      doctor: doctorId
    });

    await patient.save();
    res.status(201).json({ message: "Patient added successfully", patient });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatients = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const patients = await Patient.find({ doctor: doctorId })
      .populate({
        path: "reports",
        model: "LabReport",  
        select: "title content files uploadedBy uploadedByRole createdAt updatedAt"
      });

    res.status(200).json({ patients });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadReport = async (req, res) => {
  try {
    const { title, content, doctorId, patientId, uploadedBy, uploadedByRole, files } = req.body;

    if (!["Doctor", "LabDoctor"].includes(uploadedByRole)) {
      return res.status(400).json({ message: "uploadedByRole must be Doctor or LabDoctor" });
    }

    const report = new LabReport({
      title,
      content,  
      patient: patientId,
      uploadedBy,           
      uploadedByRole,   
      files
    });

    await report.save();

    await Patient.findByIdAndUpdate(patientId, { $push: { reports: report._id } });

    res.status(201).json({ message: "Report uploaded successfully", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getCalendar = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId)
      .populate("calendar.slots.patient", "name age gender") 
      .select("calendar");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({
      message: "Calendar fetched successfully",
      calendar: doctor.calendar,
    });
  } catch (error) {
    console.error("Error fetching calendar:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export {
  addDoctor,
  getDoctorDetails,
  addPatientToDoctor,
  addDoctorSchedule,
  attendEmergency,
  addReportToPatient, 
  createRoom
};
