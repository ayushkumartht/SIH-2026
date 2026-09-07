import mongoose from "mongoose";
import dotenv from "dotenv";
import Patient from "../models/patient.js";
import Doctor from "../models/doctor.js";
import Hospital from "../models/Hospital.js";
import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nabhacare";

async function seed() {
  try {
    console.log(" Connecting to MongoDB at:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log(" MongoDB Connected!");

    // Clear existing
    await Promise.all([
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Hospital.deleteMany({}),
      Appointment.deleteMany({}),
      Consultation.deleteMany({}),
    ]);
    console.log(" Cleared existing database records.");

    // Create Hospitals
    const hospitals = await Hospital.create([
      {
        name: "Civil Hospital Nabha",
        address: "Hospital Road, Nabha, Punjab 147201",
        contact: "+91 1765 220123",
        emergencyContact: "+91 1765 220999",
        latitude: 30.3753,
        longitude: 76.7821,
        availableBeds: 42,
        facilities: ["Emergency 24/7", "ICU", "Teleconsultation Hub", "Maternity"],
        connectedDoctorsCount: 8,
      },
      {
        name: "Community Health Centre (CHC) Bhadson",
        address: "Bhadson Road, Near Bus Stand, Punjab 147202",
        contact: "+91 1765 240456",
        emergencyContact: "+91 1765 240911",
        latitude: 30.412,
        longitude: 76.815,
        availableBeds: 18,
        facilities: ["General Medicine", "Pediatrics", "ASHA Desk"],
        connectedDoctorsCount: 4,
      },
      {
        name: "Sub-Divisional Hospital Rajpura",
        address: "GT Road, Rajpura, Punjab 140401",
        contact: "+91 1762 225678",
        emergencyContact: "+91 1762 225911",
        latitude: 30.484,
        longitude: 76.594,
        availableBeds: 60,
        facilities: ["Trauma Care", "Dialysis", "Radiology", "Tele-ICU"],
        connectedDoctorsCount: 12,
      },
    ]);

    // Create Doctors
    const doctors = await Doctor.create([
      {
        name: "Dr. Amandeep Singh",
        email: "doctor@demo.local",
        password: "demo123",
        specialization: "General Physician",
        qualification: "MBBS, MD (General Medicine)",
        registrationNo: "PMC-45892",
        phone: "+91 98765 43210",
        hospitalId: hospitals[0]._id,
        isOnline: true,
      },
      {
        name: "Dr. Sunita Sharma",
        email: "sunita@nabhacare.gov.in",
        password: "demo123",
        specialization: "Pediatrics & Maternal Care",
        qualification: "MBBS, DCH",
        registrationNo: "PMC-38104",
        phone: "+91 98765 11223",
        hospitalId: hospitals[0]._id,
        isOnline: true,
      },
      {
        name: "Dr. Rajesh Kumar",
        email: "rajesh@nabhacare.gov.in",
        password: "demo123",
        specialization: "Cardiology Specialist",
        qualification: "MBBS, MD, DM (Cardiology)",
        registrationNo: "PMC-51209",
        phone: "+91 98123 45678",
        hospitalId: hospitals[2]._id,
        isOnline: false,
      },
    ]);

    // Create Patients
    const patients = await Patient.create([
      {
        name: "Gurpreet Kaur",
        email: "patient@demo.local",
        password: "demo123",
        age: 34,
        gender: "female",
        contact: "+91 99887 76655",
        address: "Village Alhoran, Nabha",
        medicalHistory: "Type 2 Diabetes, Mild Hypertension",
      },
      {
        name: "Harjeet Singh",
        email: "harjeet@demo.local",
        password: "demo123",
        age: 52,
        gender: "male",
        contact: "+91 98111 22334",
        address: "Main Market, Bhadson",
        medicalHistory: "Asthma, Seasonal Allergies",
      },
    ]);

    // Create Appointments & Consultations
    const appointment = await Appointment.create({
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      date: new Date(),
      time: "10:30 AM",
      reason: "High fever and persistent cough for 3 days",
      status: "pending",
      appointmentType: "video",
      roomId: `room-${Date.now()}`,
    });

    await Consultation.create({
      appointment: appointment._id,
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      vitals: { temp: "101.2 °F", bp: "130/85", hr: "88 bpm", spo2: "97%" },
      diagnosis: "Acute Upper Respiratory Tract Infection",
      prescription: "Tab. Paracetamol 650mg TDS, Cap. Amoxicillin 500mg BD x 5 days",
      notes: "Advised steam inhalation, rest, and plenty of warm fluids.",
      status: "completed",
    });

    console.log(" Seed complete! Created:");
    console.log(`   - ${hospitals.length} Hospitals`);
    console.log(`   - ${doctors.length} Doctors (Demo: doctor@demo.local / demo123)`);
    console.log(`   - ${patients.length} Patients (Demo: patient@demo.local / demo123)`);
    console.log(`   - 1 Sample Appointment & Consultation record`);

    process.exit(0);
  } catch (err) {
    console.error(" Seed failed:", err);
    process.exit(1);
  }
}

seed();
