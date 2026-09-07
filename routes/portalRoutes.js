import express from "express";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import {
  getPatientProfile,
  listPortalDoctors,
  createPatientAppointment,
  listPatientAppointments,
  listPatientConsultations,
  listPatientReports,
  sharePatientLocation,
  getDoctorDashboard,
  getDoctorPatients,
  getDoctorCallCare,
} from "../controllers/portalController.js";
import {
  createOrJoinAppointmentCall,
  grantCallConsent,
  joinCallDetails,
} from "../controllers/liveCallController.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/patient/profile", authorizeRole(["patient"]), getPatientProfile);
router.get("/patient/doctors", authorizeRole(["patient"]), listPortalDoctors);
router.post(
  "/patient/appointments",
  authorizeRole(["patient"]),
  createPatientAppointment,
);
router.get(
  "/patient/appointments",
  authorizeRole(["patient"]),
  listPatientAppointments,
);
router.get(
  "/patient/consultations",
  authorizeRole(["patient"]),
  listPatientConsultations,
);
router.get("/patient/reports", authorizeRole(["patient"]), listPatientReports);
router.post(
  "/patient/location",
  authorizeRole(["patient"]),
  sharePatientLocation,
);
router.post(
  "/calls/session",
  authorizeRole(["patient", "doctor"]),
  createOrJoinAppointmentCall,
);
router.get(
  "/calls/:callId",
  authorizeRole(["patient", "doctor"]),
  joinCallDetails,
);
router.post(
  "/calls/:callId/consent",
  authorizeRole(["patient"]),
  grantCallConsent,
);

router.get("/doctor/dashboard", authorizeRole(["doctor"]), getDoctorDashboard);
router.get("/doctor/patients", authorizeRole(["doctor"]), getDoctorPatients);
router.get(
  "/doctor/calls/:callId/care",
  authorizeRole(["doctor"]),
  getDoctorCallCare,
);

export default router;
