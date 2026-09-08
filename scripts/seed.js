import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Staff from "../models/Staff.js";
import Doctor from "../models/doctor.js";
import LabDoctor from "../models/LabDoctor.js";
import Patient from "../models/patient.js";
import Hospital from "../models/Hospital.js";
import Ambulance from "../models/Ambulance.js";
import Driver from "../models/Driver.js";
import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import Emergency from "../models/Emergency.js";
import Medicine from "../models/Medicine.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nabhacare";
const PASSWORD = "demo123";

async function hash(password) {
  return bcrypt.hash(password, 10);
}

async function seed() {
  const credentials = [];
  try {
    console.log("Connecting to MongoDB at:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected.");

    await Promise.all([
      Staff.deleteMany({}),
      Doctor.deleteMany({}),
      LabDoctor.deleteMany({}),
      Patient.deleteMany({}),
      Hospital.deleteMany({}),
      Ambulance.deleteMany({}),
      Driver.deleteMany({}),
      Appointment.deleteMany({}),
      Consultation.deleteMany({}),
      Emergency.deleteMany({}),
      Medicine.deleteMany({}),
    ]);
    console.log("Cleared existing collections.");

    // --- Hospitals (real facilities, real coordinates) ---
    const hospitals = await Hospital.create([
      {
        name: "Civil Hospital Nabha",
        address: "Guru Nanak Pura Mohalla, Near Bus Stand",
        city: "Nabha",
        state: "Punjab",
        pincode: "147201",
        contact: "+91 1765 220123",
        type: "district",
        latitude: 30.3725,
        longitude: 76.1460,
        beds: 42,
        facilities: ["Emergency 24/7", "ICU", "Teleconsultation Hub", "Maternity"],
      },
      {
        name: "Community Health Centre Bhadson",
        address: "Patiala Road, Bhadson",
        city: "Bhadson",
        state: "Punjab",
        pincode: "147202",
        contact: "+91 1765 240456",
        type: "chc",
        latitude: 30.5150,
        longitude: 76.2463,
        beds: 18,
        facilities: ["General Medicine", "Pediatrics", "ASHA Desk"],
      },
      {
        name: "Civil Hospital Rajpura",
        address: "GT Road, Rajpura",
        city: "Rajpura",
        state: "Punjab",
        pincode: "140401",
        contact: "+91 1762 225678",
        type: "sub-district",
        latitude: 30.4784,
        longitude: 76.5841,
        beds: 60,
        facilities: ["Trauma Care", "Dialysis", "Radiology", "Tele-ICU"],
      },
      {
        name: "Shreya Hospital",
        address: "Cinema Road, Bouran Gate",
        city: "Nabha",
        state: "Punjab",
        pincode: "147201",
        contact: "+91 1765 650141",
        type: "private",
        latitude: 30.3721,
        longitude: 76.1401,
        beds: 30,
        facilities: ["Multi-Specialty", "24x7 Emergency", "Pharmacy"],
      },
      {
        name: "Raj General Hospital",
        address: "Nabha Road, Duladi",
        city: "Nabha",
        state: "Punjab",
        pincode: "147201",
        contact: "+91 1765 500221",
        type: "private",
        latitude: 30.3706,
        longitude: 76.1420,
        beds: 20,
        facilities: ["General Medicine", "Minor Surgery"],
      },
    ]);

    // --- Doctors ---
    const doctors = await Doctor.create([
      {
        name: "Dr. Amandeep Singh",
        email: "doctor@demo.local",
        mobile: "9876543210",
        password: await hash(PASSWORD),
        specialization: "General Physician",
        availability: true,
        status: "active",
        shiftStart: "09:00",
        shiftEnd: "17:00",
        hospital: hospitals[0]._id,
      },
      {
        name: "Dr. Sunita Sharma",
        email: "sunita@nabhacare.gov.in",
        mobile: "9876511223",
        password: await hash(PASSWORD),
        specialization: "Pediatrics & Maternal Care",
        availability: true,
        status: "active",
        shiftStart: "10:00",
        shiftEnd: "18:00",
        hospital: hospitals[0]._id,
      },
      {
        name: "Dr. Rajesh Kumar",
        email: "rajesh@nabhacare.gov.in",
        mobile: "9812345678",
        password: await hash(PASSWORD),
        specialization: "Cardiology Specialist",
        availability: true,
        status: "active",
        shiftStart: "09:00",
        shiftEnd: "15:00",
        hospital: hospitals[2]._id,
      },
    ]);
    await Hospital.findByIdAndUpdate(hospitals[0]._id, { $push: { doctors: { $each: [doctors[0]._id, doctors[1]._id] } } });
    await Hospital.findByIdAndUpdate(hospitals[2]._id, { $push: { doctors: doctors[2]._id } });

    // --- Lab doctor ---
    const labDoctor = await LabDoctor.create({
      name: "Dr. Kiran Bedi",
      email: "lab@demo.local",
      mobile: "9812399887",
      password: await hash(PASSWORD),
      specialization: "Pathology",
    });

    // --- Staff: admin, receptionist, ASHA workers ---
    const admin = await Staff.create({
      name: "Admin User",
      email: "admin@demo.local",
      password: await hash(PASSWORD),
      role: "admin",
    });
    const receptionist = await Staff.create({
      name: "Receptionist Desk",
      email: "receptionist@demo.local",
      password: await hash(PASSWORD),
      role: "receptionist",
    });
    const asha = await Staff.create({
      name: "Muskan Gupta",
      email: "asha@demo.local",
      password: await hash(PASSWORD),
      role: "asha",
    });

    // --- Patients ---
    const patients = await Patient.create([
      {
        name: "Gurpreet Kaur",
        email: "patient@demo.local",
        password: await hash(PASSWORD),
        age: 34,
        gender: "female",
        contact: "9988776655",
        village: "Alhoran, Nabha",
        history: "Type 2 Diabetes, Mild Hypertension",
        doctor: doctors[0]._id,
      },
      {
        name: "Harjeet Singh",
        email: "harjeet@demo.local",
        password: await hash(PASSWORD),
        age: 52,
        gender: "male",
        contact: "9811122334",
        village: "Main Market, Bhadson",
        history: "Asthma, Seasonal Allergies",
        doctor: doctors[1]._id,
      },
      {
        name: "Simran Kaur",
        age: 28,
        gender: "female",
        contact: "9900011223",
        village: "Sanaur",
        history: "First ANC visit",
        createdByAsha: String(asha._id),
      },
    ]);

    // --- Ambulances + drivers ---
    const drivers = await Driver.create([
      { name: "Balwinder Singh", phone: "9855511111", licenseNo: "PB-DL-001", email: "balwinder.driver@demo.local", password: await hash(PASSWORD) },
      { name: "Manpreet Kaur", phone: "9855522222", licenseNo: "PB-DL-002", email: "manpreet.driver@demo.local", password: await hash(PASSWORD) },
      { name: "Gurmeet Singh", phone: "9855533333", licenseNo: "PB-DL-003", email: "gurmeet.driver@demo.local", password: await hash(PASSWORD) },
    ]);
    await Ambulance.create([
      {
        vehicleNumber: "PB-11-AB-1234",
        type: "advanced_life_support",
        hospitalId: hospitals[0]._id,
        driver: drivers[0]._id,
        capacity: 2,
        currentLocation: { latitude: 30.3760, longitude: 76.1510 },
        status: "available",
      },
      {
        vehicleNumber: "PB-11-CD-5678",
        type: "basic",
        hospitalId: hospitals[1]._id,
        driver: drivers[1]._id,
        capacity: 1,
        currentLocation: { latitude: 30.4110, longitude: 76.1840 },
        status: "available",
      },
      {
        vehicleNumber: "PB-11-EF-9012",
        type: "patient_transport",
        hospitalId: hospitals[0]._id,
        driver: drivers[2]._id,
        capacity: 3,
        currentLocation: { latitude: 30.3730, longitude: 76.1470 },
        status: "available",
      },
    ]);

    // --- Sample appointment + consultation ---
    const appointment = await Appointment.create({
      patient: patients[0]._id,
      doctorId: String(doctors[0]._id),
      date: new Date(),
      time: "10:30",
      reason: "High fever and persistent cough for 3 days",
      appointmentType: "video",
      status: "confirmed",
      bookingMode: "online",
      createdAt: new Date(),
    });

    await Consultation.create({
      patientId: String(patients[0]._id),
      doctorId: String(doctors[0]._id),
      appointmentId: appointment._id,
      status: "completed",
      consent: { granted: true, grantedAt: new Date(), grantedBy: String(patients[0]._id) },
      symptoms: "High fever and persistent cough for 3 days",
      vitals: [{
        temperatureC: 38.4,
        heartRateBpm: 88,
        systolicBp: 130,
        diastolicBp: 85,
        oxygenSaturationPercent: 97,
        source: "doctor",
        recordedBy: String(doctors[0]._id),
      }],
      assessment: "Acute upper respiratory tract infection",
      outcome: "not_urgent",
      prescription: "Tab. Paracetamol 650mg TDS, Cap. Amoxicillin 500mg BD x 5 days",
      advice: "Advised steam inhalation, rest, and plenty of warm fluids.",
      startedAt: new Date(),
      completedAt: new Date(),
    });

    // --- Sample resolved emergency ---
    await Emergency.create({
      patient: patients[1]._id,
      doctor: doctors[2]._id,
      reportedByRole: "patient",
      reportedBy: patients[1]._id,
      emergencyType: "medical",
      severity: "high",
      latitude: 30.4838,
      longitude: 76.5945,
      title: "Chest pain",
      details: "Sudden chest pain and breathlessness",
      dispatchStatus: "closed",
      acknowledged: true,
      doctorNote: "Referred to cardiology, stabilized on arrival.",
      closedAt: new Date(),
    });

    // --- Pharmacy stock ---
    await Medicine.create([
      { name: "Paracetamol 650mg", hospital: hospitals[0]._id, category: "Analgesic", unit: "tablets", stockQuantity: 480, lowStockThreshold: 50 },
      { name: "Amoxicillin 500mg", hospital: hospitals[0]._id, category: "Antibiotic", unit: "capsules", stockQuantity: 15, lowStockThreshold: 50 },
      { name: "ORS Sachets", hospital: hospitals[0]._id, category: "Rehydration", unit: "sachets", stockQuantity: 200, lowStockThreshold: 30 },
      { name: "Insulin (Human)", hospital: hospitals[1]._id, category: "Diabetes", unit: "vials", stockQuantity: 0, lowStockThreshold: 10 },
      { name: "Paracetamol 650mg", hospital: hospitals[2]._id, category: "Analgesic", unit: "tablets", stockQuantity: 120, lowStockThreshold: 50 },
    ]);

    credentials.push(
      { role: "admin", email: admin.email, password: PASSWORD },
      { role: "receptionist", email: receptionist.email, password: PASSWORD },
      { role: "doctor", email: doctors[0].email, password: PASSWORD },
      { role: "doctor", email: doctors[1].email, password: PASSWORD },
      { role: "doctor", email: doctors[2].email, password: PASSWORD },
      { role: "lab", email: labDoctor.email, password: PASSWORD },
      { role: "asha", email: asha.email, password: PASSWORD },
      { role: "patient", email: patients[0].email, password: PASSWORD },
      { role: "patient", email: patients[1].email, password: PASSWORD },
      { role: "driver", email: drivers[0].email, password: PASSWORD },
      { role: "driver", email: drivers[1].email, password: PASSWORD },
      { role: "driver", email: drivers[2].email, password: PASSWORD },
    );

    console.log("\nSeed complete. Seeded test accounts:\n");
    for (const c of credentials) {
      console.log(`  ${c.role.padEnd(12)} ${c.email.padEnd(28)} ${c.password}`);
    }
    console.log(`\n  ${hospitals.length} hospitals (real Nabha-area facilities), ${doctors.length} doctors, ${patients.length} patients, ${drivers.length} drivers/ambulances, 5 medicine stock records, 1 appointment, 1 consultation, 1 emergency.\n`);

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
