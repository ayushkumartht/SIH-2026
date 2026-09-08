import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

dotenv.config({ quiet: true });

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(helmet());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

const apiRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use("/api/", apiRateLimiter);
app.use("/api/auth/", authRateLimiter);

import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import offlineRequestRoute from "./routes/offlineRequestRoute.js";
import labDoctorRoutes from "./routes/labDoctorRoutes.js";
import portalRoutes from "./routes/portalRoutes.js";
import ashaRoutes from "./routes/ashaRoutes.js";
import ambulanceRoutes from "./routes/ambulanceRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import transportRoutes from "./routes/transportRoutes.js";
import twilioWebhookRoutes from "./routes/twilioWebhookRoutes.js";

app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/lab-doctors", labDoctorRoutes);
app.use("/offline-requests", offlineRequestRoute);
app.use("/api/portal", portalRoutes);
app.use("/api/asha", ashaRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/transport-requests", transportRoutes);
// Twilio posts form-encoded (not JSON) and calls this route directly from the
// internet, so it gets its own body parser and sits outside the JWT-protected routes.
app.use("/api/twilio", express.urlencoded({ extended: false }), twilioWebhookRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, error: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, error: err.message });
  }
  console.error(err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

export default app;
