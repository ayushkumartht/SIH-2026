import express from "express";
import {
  addPatientToDoctor,
  addDoctorSchedule,
  attendEmergency,
  addDoctor,
  getDoctorDetails,
  addReportToPatient,
  upsertCalendarSlot,
  addEmergency,
  getDoctorEmergencies,
  updateEmergency,
  acknowledgeEmergency,
  createRoom,
  addPatient,
  getPatients,
  uploadReport,
  getCalendar
} from "../controllers/doctorController.js";
import { createDailyRoom, createDailyToken, getDailyRoom, deleteDailyRoom } from "../controllers/dailyController.js";
import { getDoctorIdFromParams, getDoctorAndPatientFromParams } from "../middleware/doctorMiddleware.js";
import { updateCallQuality, recordCallVitals, endCall } from "../controllers/callQualityController.js";
import { authenticateTeleconsultation } from "../middleware/auth.js";
import { getConsultation, getConsultationAudits, getConsultationForRoom, updateConsultation } from "../controllers/consultationController.js";
// import { createRoom } from "../controllers/roomController.js";

const router = express.Router();

router.get("/consultations/:id", authenticateTeleconsultation, getConsultation);
router.patch("/consultations/:id", authenticateTeleconsultation, updateConsultation);
router.get("/consultations/:id/audits", authenticateTeleconsultation, getConsultationAudits);
router.get("/calls/:callId/consultation", authenticateTeleconsultation, getConsultationForRoom);

router.post("/calls/:callId/quality", authenticateTeleconsultation, updateCallQuality);
router.post("/calls/:callId/vitals", authenticateTeleconsultation, recordCallVitals);
router.post("/calls/:callId/end", authenticateTeleconsultation, endCall);

// Add doctor (no doctorId required)
router.post("/", addDoctor);

// Routes that require doctorId - apply middleware
router.get("/:doctorId", getDoctorIdFromParams, getDoctorDetails);
router.post("/:doctorId/patients", getDoctorIdFromParams, addPatientToDoctor);
router.post("/:doctorId/schedule", getDoctorIdFromParams, addDoctorSchedule);
router.put("/:doctorId/emergency/:emergencyId", getDoctorIdFromParams, attendEmergency);

router.post("/:doctorId/patients/:patientId/reports", getDoctorAndPatientFromParams, addReportToPatient);

router.post("/:doctorId/calendar", upsertCalendarSlot);

router.post("/:doctorId/emergencies", addEmergency);

router.get("/:doctorId/emergencies", getDoctorEmergencies);

router.put("/emergencies/:emergencyId", updateEmergency); //doctors note

router.patch("/emergencies/:emergencyId/acknowledge", acknowledgeEmergency); 

router.post("/create-room", authenticateTeleconsultation, createRoom);

router.post("/add-patient", addPatient);

router.get("/patients/:doctorId", getPatients);

router.post("/upload-report", uploadReport);

router.get("/:doctorId/calendar", getCalendar);

router.post("/create-daily-room", authenticateTeleconsultation, createDailyRoom);
router.post("/daily-room/:roomName/token", authenticateTeleconsultation, createDailyToken);
router.get("/daily-room/:roomName", authenticateTeleconsultation, getDailyRoom);
router.delete("/daily-room/:roomName", authenticateTeleconsultation, deleteDailyRoom);

export default router;