import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import Doctor from "../models/doctor.js";
import Patient from "../models/patient.js";
import LabReport from "../models/labReport.js";
import PatientLocation from "../models/PatientLocation.js";
import Hospital from "../models/Hospital.js";
import { findCallRoom } from "../services/callRoomStore.js";
import {
  findConsultation,
  saveConsultation,
} from "../services/consultationStore.js";
import { recordConsultationAudit } from "../services/consultationAuditStore.js";
import {
  createDemoAppointment,
  findDemoPatientById,
  getDemoDoctor,
  listDemoAppointments,
  listDemoDoctors,
  listDemoDoctorAppointments,
} from "../services/portalDemoStore.js";
import { listConsultations } from "../services/consultationStore.js";

const publicDoctor = (doctor) => ({
  id: doctor._id,
  name: doctor.name,
  email: doctor.email,
  specialization: doctor.specialization,
  availability: doctor.availability,
  status: doctor.status,
  calendar: doctor.calendar,
});

export async function getPatientProfile(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true") {
      const patient = findDemoPatientById(req.user.id);
      if (!patient)
        return res
          .status(404)
          .json({ success: false, error: "Patient not found" });
      return res.json({
        success: true,
        data: {
          ...patient,
          password: undefined,
          doctor: patient.doctor ? getDemoDoctor() : null,
        },
      });
    }
    const patient = await Patient.findById(req.user.id).populate(
      "doctor",
      "name specialization email",
    );
    if (!patient)
      return res
        .status(404)
        .json({ success: false, error: "Patient not found" });
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
}

export async function listPortalDoctors(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true")
      return res.json({
        success: true,
        data: listDemoDoctors().map(publicDoctor),
      });
    const filter = { status: { $ne: "on-leave" } };
    if (req.query.search)
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { specialization: { $regex: req.query.search, $options: "i" } },
      ];
    const doctors = await Doctor.find(filter)
      .select("name email specialization availability status calendar")
      .limit(50);
    res.json({ success: true, data: doctors.map(publicDoctor) });
  } catch (error) {
    next(error);
  }
}

export async function createPatientAppointment(req, res, next) {
  try {
    const {
      doctorId,
      date,
      time,
      reason,
      appointmentType = "video",
    } = req.body;
    if (!doctorId || !date || !time)
      return res
        .status(400)
        .json({ success: false, error: "Doctor, date, and time are required" });
    if (process.env.DEMO_MODE === "true") {
      if (String(doctorId) !== "demo-doctor")
        return res
          .status(404)
          .json({ success: false, error: "Demo doctor not found" });
      const appointment = createDemoAppointment({
        patient: String(req.user.id),
        doctorId: "demo-doctor",
        date,
        time,
        reason,
        appointmentType,
        doctor: publicDoctor(getDemoDoctor()),
      });
      return res.status(201).json({ success: true, data: appointment });
    }
    const [doctor, patient] = await Promise.all([
      Doctor.findById(doctorId),
      Patient.findById(req.user.id),
    ]);
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, error: "Doctor not found" });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, error: "Patient not found" });
    if (!patient.doctor) {
      patient.doctor = doctor._id;
      await patient.save();
    }
    const appointment = await Appointment.create({
      patient: patient._id,
      doctorId: String(doctor._id),
      date: new Date(date),
      time,
      reason,
      appointmentType,
      status: "confirmed",
      bookingMode: "online",
      createdAt: new Date(),
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
}

export async function listPatientAppointments(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true")
      return res.json({
        success: true,
        data: listDemoAppointments(req.user.id),
      });
    const appointments = await Appointment.find({ patient: req.user.id }).sort({
      date: 1,
      time: 1,
    });
    const doctorIds = [
      ...new Set(appointments.map((item) => item.doctorId).filter(Boolean)),
    ];
    const doctors = await Doctor.find({ _id: { $in: doctorIds } }).select(
      "name specialization email",
    );
    const doctorMap = new Map(
      doctors.map((doctor) => [String(doctor._id), doctor]),
    );
    res.json({
      success: true,
      data: appointments.map((appointment) => ({
        ...appointment.toObject(),
        doctor: doctorMap.get(String(appointment.doctorId)) || null,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function listPatientConsultations(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true")
      return res.json({
        success: true,
        data: listConsultations({ patientId: String(req.user.id) }),
      });
    const consultations = await Consultation.find({
      patientId: String(req.user.id),
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: consultations });
  } catch (error) {
    next(error);
  }
}

export async function listPatientReports(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true")
      return res.json({ success: true, data: [] });
    const reports = await LabReport.find({ patient: req.user.id })
      .select(
        "title content files uploadedBy uploadedByRole createdAt updatedAt",
      )
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

export async function sharePatientLocation(req, res, next) {
  try {
    const { consultationId, latitude, longitude, accuracyMeters, consent } =
      req.body;
    if (consent !== true)
      return res
        .status(400)
        .json({
          success: false,
          error: "Explicit location consent is required",
        });
    if (
      ![latitude, longitude].every(Number.isFinite) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    )
      return res
        .status(400)
        .json({
          success: false,
          error: "Valid latitude and longitude are required",
        });
    const consultation = await findConsultation(consultationId);
    if (!consultation || String(consultation.patientId) !== String(req.user.id))
      return res
        .status(403)
        .json({
          success: false,
          error: "You cannot share location for this consultation",
        });
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const payload = {
      consultationId: String(consultationId),
      patientId: String(req.user.id),
      doctorId: String(consultation.doctorId),
      latitude,
      longitude,
      accuracyMeters: Number.isFinite(accuracyMeters)
        ? accuracyMeters
        : undefined,
      consentedAt: new Date(),
      expiresAt,
    };
    const location =
      process.env.DEMO_MODE === "true"
        ? payload
        : await PatientLocation.findOneAndUpdate(
            {
              consultationId: payload.consultationId,
              patientId: payload.patientId,
            },
            payload,
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
    await recordConsultationAudit({
      consultationId,
      action: "location_shared",
      actorId: String(req.user.id),
      actorRole: req.user.role,
    });
    res
      .status(201)
      .json({
        success: true,
        data: { shared: true, expiresAt: location.expiresAt },
      });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorCallCare(req, res, next) {
  try {
    const call = await findCallRoom(req.params.callId);
    if (!call || String(call.doctorId) !== String(req.user.id))
      return res
        .status(403)
        .json({ success: false, error: "You are not assigned to this call" });
    const consultation = await findConsultation(call.consultationId);
    if (!consultation)
      return res
        .status(404)
        .json({ success: false, error: "Consultation not found" });
    const [patient, reports, location] =
      process.env.DEMO_MODE === "true"
        ? [null, [], null]
        : await Promise.all([
            Patient.findById(call.patientId).select(
              "name age gender contact history",
            ),
            LabReport.find({ patient: call.patientId })
              .select("title content files createdAt uploadedByRole")
              .sort({ createdAt: -1 }),
            PatientLocation.findOne({
              consultationId: String(consultation._id),
              patientId: String(call.patientId),
              expiresAt: { $gt: new Date() },
            }).sort({ updatedAt: -1 }),
          ]);
    await recordConsultationAudit({
      consultationId: consultation._id,
      action: "doctor_viewed_call_care",
      actorId: String(req.user.id),
      actorRole: req.user.role,
    });
    res.json({
      success: true,
      data: {
        patient,
        consultation,
        vitals: consultation.vitals || [],
        reports,
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracyMeters: location.accuracyMeters,
              expiresAt: location.expiresAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorDashboard(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true") {
      const doctor = getDemoDoctor();
      return res.json({
        success: true,
        data: {
          doctor: publicDoctor(doctor),
          patients: [],
          appointments: listDemoDoctorAppointments(req.user.id),
          consultations: listConsultations({ doctorId: String(req.user.id) }),
        },
      });
    }
    const doctor = await Doctor.findById(req.user.id).populate(
      "patients",
      "name email age gender contact history reports",
    );
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, error: "Doctor not found" });
    const [appointments, consultations] = await Promise.all([
      Appointment.find({ doctorId: String(doctor._id) })
        .sort({ date: 1, time: 1 })
        .populate("patient", "name email age gender contact history"),
      Consultation.find({ doctorId: String(doctor._id) }).sort({
        createdAt: -1,
      }),
    ]);
    res.json({
      success: true,
      data: {
        doctor: publicDoctor(doctor),
        patients: doctor.patients,
        appointments,
        consultations,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorPatients(req, res, next) {
  try {
    if (process.env.DEMO_MODE === "true")
      return res.json({ success: true, data: [] });
    const patients = await Patient.find({ doctor: req.user.id })
      .select("name email age gender contact history reports createdAt")
      .sort({ name: 1 });
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
}

// Haversine formula to calculate distance between two lat/lng points in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbyHospitals(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 30; // km
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return res.status(400).json({ success: false, error: "lat and lng are required" });

    if (process.env.DEMO_MODE === "true") {
      // Return demo hospitals around the provided coordinates
      const demoHospitals = [
        { _id: "demo-h1", name: "District Hospital Nabha", type: "district", address: "Nabha, Punjab", city: "Nabha", contact: "01765-220000", latitude: lat + 0.01, longitude: lng + 0.01, beds: 200, facilities: ["Emergency", "ICU", "OT"], doctors: [] },
        { _id: "demo-h2", name: "PHC Sanaur", type: "phc", address: "Sanaur, Patiala", city: "Sanaur", contact: "0175-2700001", latitude: lat - 0.02, longitude: lng + 0.015, beds: 30, facilities: ["OPD", "Maternity"], doctors: [] },
        { _id: "demo-h3", name: "CHC Rajpura", type: "chc", address: "Rajpura, Punjab", city: "Rajpura", contact: "01762-234567", latitude: lat + 0.03, longitude: lng - 0.02, beds: 50, facilities: ["Emergency", "OPD", "Lab"], doctors: [] },
      ];
      const withDistance = demoHospitals.map((h) => ({
        ...h,
        distanceKm: haversineKm(lat, lng, h.latitude, h.longitude).toFixed(2),
      }));
      return res.json({ success: true, data: withDistance });
    }

    const hospitals = await Hospital.find({ isActive: true })
      .populate("doctors", "name specialization status");

    const nearby = hospitals
      .map((h) => ({
        ...h.toObject(),
        distanceKm: haversineKm(lat, lng, h.latitude, h.longitude).toFixed(2),
      }))
      .filter((h) => parseFloat(h.distanceKm) <= radius)
      .sort((a, b) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));

    res.json({ success: true, data: nearby });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorHospital(req, res, next) {
  try {
    const { doctorId } = req.params;
    if (process.env.DEMO_MODE === "true")
      return res.json({ success: true, data: null });
    const doctor = await Doctor.findById(doctorId)
      .populate("hospital")
      .select("name specialization hospital");
    if (!doctor)
      return res.status(404).json({ success: false, error: "Doctor not found" });
    res.json({ success: true, data: doctor.hospital || null });
  } catch (error) {
    next(error);
  }
}

export async function getPatientLocationForDoctor(req, res, next) {
  try {
    const { patientId, consultationId } = req.params;
    if (process.env.DEMO_MODE === "true")
      return res.json({ success: true, data: null });
    // Only the assigned doctor can view patient location
    const consultation = await Consultation.findById(consultationId);
    if (!consultation || String(consultation.doctorId) !== String(req.user.id))
      return res.status(403).json({ success: false, error: "Access denied" });
    const location = await PatientLocation.findOne({
      consultationId: String(consultationId),
      patientId: String(patientId),
      expiresAt: { $gt: new Date() },
    }).sort({ updatedAt: -1 });
    res.json({ success: true, data: location ? { latitude: location.latitude, longitude: location.longitude, accuracyMeters: location.accuracyMeters, expiresAt: location.expiresAt } : null });
  } catch (error) {
    next(error);
  }
}
