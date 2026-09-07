import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import Doctor from "../models/doctor.js";
import Patient from "../models/patient.js";
import LabReport from "../models/labReport.js";
import PatientLocation from "../models/PatientLocation.js";
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
