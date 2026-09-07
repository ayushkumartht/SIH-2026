import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import Doctor from "../models/doctor.js";
import Patient from "../models/patient.js";
import LabReport from "../models/labReport.js";
import PatientLocation from "../models/PatientLocation.js";
import Hospital from "../models/Hospital.js";
import Emergency from "../models/Emergency.js";
import { tryLockAndBook } from "../services/appointmentService.js";
import { recordConsultationAudit } from "../services/consultationAuditStore.js";
import { findConsultation } from "../services/consultationStore.js";
import { findCallRoom } from "../services/callRoomStore.js";
import { haversineKm } from "../utils/geo.js";

const publicDoctor = (doctor) => ({
  id: doctor._id,
  name: doctor.name,
  email: doctor.email,
  specialization: doctor.specialization,
  availability: doctor.availability,
  status: doctor.status,
  shiftStart: doctor.shiftStart,
  shiftEnd: doctor.shiftEnd,
});

export async function getPatientProfile(req, res, next) {
  try {
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
    const filter = { status: { $ne: "on-leave" } };
    if (req.query.search)
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { specialization: { $regex: req.query.search, $options: "i" } },
      ];
    const doctors = await Doctor.find(filter)
      .select("name email specialization availability status shiftStart shiftEnd")
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
    let appointment;
    try {
      appointment = await tryLockAndBook({
        patient: patient._id,
        doctorId: String(doctor._id),
        date: new Date(date),
        time,
        appointmentType,
      });
    } catch (bookingError) {
      return res
        .status(409)
        .json({ success: false, error: bookingError.message || "That slot is no longer available" });
    }
    appointment.reason = reason;
    await appointment.save();
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
}

export async function listPatientAppointments(req, res, next) {
  try {
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
    const location = await PatientLocation.findOneAndUpdate(
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
    const [patient, reports, location] = await Promise.all([
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
    const doctor = await Doctor.findById(req.user.id).select("-password");
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, error: "Doctor not found" });
    const [patients, appointments, consultations, emergencies] = await Promise.all([
      Patient.find({ doctor: doctor._id }).select(
        "name email age gender contact history reports",
      ),
      Appointment.find({ doctorId: String(doctor._id) })
        .sort({ date: 1, time: 1 })
        .populate("patient", "name email age gender contact history"),
      Consultation.find({ doctorId: String(doctor._id) }).sort({
        createdAt: -1,
      }),
      Emergency.find({ doctor: doctor._id, dispatchStatus: { $nin: ["closed", "cancelled"] } })
        .populate("patient", "name age gender contact")
        .populate({ path: "assignedVehicle", populate: { path: "driver" } })
        .sort({ severity: -1, createdAt: -1 }),
    ]);
    res.json({
      success: true,
      data: {
        doctor: publicDoctor(doctor),
        patients,
        appointments,
        consultations,
        emergencies,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorPatients(req, res, next) {
  try {
    const patients = await Patient.find({ doctor: req.user.id })
      .select("name email age gender contact history reports createdAt")
      .sort({ name: 1 });
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
}

export async function getNearbyHospitals(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 30; // km
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return res.status(400).json({ success: false, error: "lat and lng are required" });

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
