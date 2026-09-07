import Doctor from "../models/doctor.js";
import Patient from "../models/patient.js";
import LabReport from "../models/labReport.js";
import bcrypt from "bcryptjs";

const addDoctor = async (req, res) => {
  try {
    const { name, email, mobile, password, specialization, availability, status, shiftStart, shiftEnd, hospital } = req.body;
    if (!name || !email || !mobile || !password || !specialization) {
      return res.status(400).json({
        success: false,
        message: "name, email, mobile, password and specialization are required",
      });
    }

    const existingDoctor = await Doctor.findOne({ $or: [{ mobile }, { email: email.toLowerCase() }] });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Doctor with this email or mobile already exists",
      });
    }

    const doctor = new Doctor({
      name,
      email: email.toLowerCase(),
      mobile,
      password: await bcrypt.hash(password, 10),
      specialization,
      availability,
      status,
      shiftStart,
      shiftEnd,
      hospital: hospital || null,
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor: { ...doctor.toObject(), password: undefined },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding doctor",
      error: error.message,
    });
  }
};

const getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId).select("-password");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const patients = await Patient.find({ doctor: doctor._id })
      .select("name age gender contact history village reports")
      .populate({
        path: "reports",
        model: "LabReport",
        select: "title content files uploadedBy uploadedByRole createdAt updatedAt",
      });

    res.json({ doctor, patients });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addPatientToDoctor = async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const { name, age, gender, contact, history, village } = req.body;

    const patient = new Patient({
      name,
      age,
      gender,
      contact,
      history,
      village,
      doctor: doctorId,
    });
    await patient.save();

    res.status(201).json({
      success: true,
      message: "Patient added successfully",
      patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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

export {
  addDoctor,
  getDoctorDetails,
  addPatientToDoctor,
  addReportToPatient,
};
