import request from "supertest";
import app from "../app.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./dbSetup.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function signupPatient(email) {
  const res = await request(app).post("/api/auth/patient/signup").send({
    name: "Patient " + email,
    email,
    password: "password123",
    age: 28,
    gender: "female",
    contact: "9111111111",
  });
  return res.body.data;
}

async function signupDoctor(email) {
  const res = await request(app).post("/api/auth/signup").send({
    name: "Doctor " + email,
    email,
    password: "password123",
    role: "doctor",
    mobile: "9222222222",
    specialization: "General Physician",
  });
  return res.body.data;
}

describe("Appointment booking", () => {
  test("double-booking the same doctor/date/time slot is rejected", async () => {
    const doctor = await signupDoctor("doc-booking@test.local");
    const patientA = await signupPatient("patientA-booking@test.local");
    const patientB = await signupPatient("patientB-booking@test.local");

    const date = new Date();
    date.setDate(date.getDate() + 1);
    const isoDate = date.toISOString().slice(0, 10);

    const firstBooking = await request(app)
      .post("/api/portal/patient/appointments")
      .set("Authorization", `Bearer ${patientA.token}`)
      .send({ doctorId: doctor.user.id, date: isoDate, time: "10:00", reason: "Fever" });
    expect(firstBooking.status).toBe(201);

    const secondBooking = await request(app)
      .post("/api/portal/patient/appointments")
      .set("Authorization", `Bearer ${patientB.token}`)
      .send({ doctorId: doctor.user.id, date: isoDate, time: "10:00", reason: "Cough" });
    expect(secondBooking.status).toBe(409);
  });

  test("a different time slot on the same day is accepted", async () => {
    const doctor = await signupDoctor("doc-booking2@test.local");
    const patientA = await signupPatient("patientA-booking2@test.local");
    const patientB = await signupPatient("patientB-booking2@test.local");

    const date = new Date();
    date.setDate(date.getDate() + 1);
    const isoDate = date.toISOString().slice(0, 10);

    const firstBooking = await request(app)
      .post("/api/portal/patient/appointments")
      .set("Authorization", `Bearer ${patientA.token}`)
      .send({ doctorId: doctor.user.id, date: isoDate, time: "10:00", reason: "Fever" });
    expect(firstBooking.status).toBe(201);

    const secondBooking = await request(app)
      .post("/api/portal/patient/appointments")
      .set("Authorization", `Bearer ${patientB.token}`)
      .send({ doctorId: doctor.user.id, date: isoDate, time: "11:00", reason: "Cough" });
    expect(secondBooking.status).toBe(201);
  });
});
