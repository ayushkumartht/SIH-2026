import express from "express";
import {
  getLabDoctorDetails,
  addLabPatient,
  getLabPatients,
  addLabReport,
  getLabReports
} from "../controllers/labDoctorController.js";
import { attachLabDoctor } from "../middleware/labDoctorMiddleware.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken, authorizeRole(["lab"]), attachLabDoctor);

// Get the signed-in lab doctor's own details
router.get("/me", getLabDoctorDetails);

// Patient management (scoped to the signed-in lab doctor)
router.post("/patients", addLabPatient);
router.get("/patients", getLabPatients);

// Report management (scoped to the signed-in lab doctor)
router.post("/reports", addLabReport);
router.get("/reports", getLabReports);

export default router;
