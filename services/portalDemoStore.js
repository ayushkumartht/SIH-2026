import bcrypt from 'bcryptjs';

const demoDoctor = {
  _id: 'demo-doctor',
  name: 'Dr. Demo Sharma',
  email: 'doctor@demo.local',
  specialization: 'General Physician',
  mobile: '9999999999',
  availability: true,
  status: 'active',
  calendar: [],
};

const demoPatients = new Map();
const demoAppointments = [];

const defaultPatient = {
  _id: 'demo-patient',
  name: 'Demo Patient',
  email: 'patient@demo.local',
  age: 28,
  gender: 'other',
  contact: '9999999998',
  doctor: null,
  history: '',
  createdAt: new Date(),
};

demoPatients.set(defaultPatient.email, { ...defaultPatient, password: bcrypt.hashSync('demo123', 10) });

export function demoDoctorUser() {
  return { id: demoDoctor._id, name: demoDoctor.name, email: demoDoctor.email, role: 'doctor', specialization: demoDoctor.specialization };
}

export function demoPatientUser(patient) {
  return { id: patient._id, name: patient.name, email: patient.email, role: 'patient', age: patient.age, gender: patient.gender, contact: patient.contact, doctor: patient.doctor };
}

export function getDemoDoctor() { return demoDoctor; }
export function listDemoDoctors() { return [demoDoctor]; }
export function findDemoPatientByEmail(email) { return demoPatients.get(email.toLowerCase()) || null; }
export function findDemoPatientById(id) { return [...demoPatients.values()].find((patient) => patient._id === String(id)) || null; }

export async function createDemoPatient(data) {
  const id = `demo-patient-${Date.now()}`;
  const patient = { _id: id, name: data.name, email: data.email.toLowerCase(), age: Number(data.age), gender: data.gender, contact: data.contact, doctor: null, history: '', createdAt: new Date(), password: await bcrypt.hash(data.password, 10) };
  demoPatients.set(patient.email, patient);
  return patient;
}

export function listDemoAppointments(patientId) { return demoAppointments.filter((appointment) => !patientId || appointment.patient === String(patientId)); }
export function listDemoDoctorAppointments(doctorId) { return demoAppointments.filter((appointment) => appointment.doctorId === String(doctorId)); }
export function findDemoAppointmentById(id) { return demoAppointments.find((appointment) => appointment._id === String(id)) || null; }
export function createDemoAppointment(data) {
  const appointment = { _id: `demo-appointment-${Date.now()}`, ...data, status: 'confirmed', bookingMode: 'online', createdAt: new Date() };
  demoAppointments.unshift(appointment);
  return appointment;
}
