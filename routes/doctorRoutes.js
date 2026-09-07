import express from "express";
import {
  addPatientToDoctor,
  addDoctor,
  getDoctorDetails,
  addReportToPatient,
} from "../controllers/doctorController.js";
import { getDoctorIdFromParams, getDoctorAndPatientFromParams } from "../middleware/doctorMiddleware.js";
import { updateCallQuality, recordCallVitals, endCall } from "../controllers/callQualityController.js";
import { authenticateTeleconsultation, authenticateToken, authorizeRole } from "../middleware/auth.js";
import { getConsultation, getConsultationAudits, getConsultationForRoom, updateConsultation } from "../controllers/consultationController.js";

const router = express.Router();

router.get("/consultations/:id", authenticateTeleconsultation, getConsultation);
router.patch("/consultations/:id", authenticateTeleconsultation, updateConsultation);
router.get("/consultations/:id/audits", authenticateTeleconsultation, getConsultationAudits);
router.get("/calls/:callId/consultation", authenticateTeleconsultation, getConsultationForRoom);

router.post("/calls/:callId/quality", authenticateTeleconsultation, updateCallQuality);
router.post("/calls/:callId/vitals", authenticateTeleconsultation, recordCallVitals);
router.post("/calls/:callId/end", authenticateTeleconsultation, endCall);

// Admin/receptionist doctor-management routes
router.use(authenticateToken, authorizeRole(["admin", "receptionist"]));

router.post("/", authorizeRole(["admin"]), addDoctor);

router.get("/:doctorId", getDoctorIdFromParams, getDoctorDetails);
router.post("/:doctorId/patients", getDoctorIdFromParams, addPatientToDoctor);

router.post("/:doctorId/patients/:patientId/reports", getDoctorAndPatientFromParams, addReportToPatient);

export default router;