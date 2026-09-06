import express from "express";
import { 
  getLabDoctorDetails,
  addLabPatient,
  getLabPatients,
  addLabReport,
  getLabReports
} from "../controllers/labDoctorController.js";
import { getLabDoctorIdFromParams } from "../middleware/labDoctorMiddleware.js";

const router = express.Router();

// Get lab doctor details
router.get("/:doctorId", getLabDoctorIdFromParams, getLabDoctorDetails);

// Patient management
router.post("/:doctorId/patients", getLabDoctorIdFromParams, addLabPatient);
router.get("/:doctorId/patients", getLabDoctorIdFromParams, getLabPatients);

// Report management
router.post("/:doctorId/reports", getLabDoctorIdFromParams, addLabReport);
router.get("/:doctorId/reports", getLabDoctorIdFromParams, getLabReports);

export default router;