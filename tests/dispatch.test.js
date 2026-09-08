import request from "supertest";
import app from "../app.js";
import Hospital from "../models/Hospital.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./dbSetup.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

// Keep the cascade fast in tests instead of the real 30s default.
process.env.DISPATCH_TIMEOUT_SECONDS = "1";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signupPatient(email) {
  const res = await request(app).post("/api/auth/patient/signup").send({
    name: "Patient " + email,
    email,
    password: "password123",
    age: 30,
    gender: "male",
    contact: "9333333333",
  });
  return res.body.data;
}

async function signupAdmin(email) {
  const res = await request(app).post("/api/auth/signup").send({
    name: "Admin " + email,
    email,
    password: "password123",
    role: "admin",
  });
  return res.body.data;
}

async function createAmbulance(adminToken, { vehicleNumber, status, lat, lng, driverEmail, driverPassword }) {
  const res = await request(app)
    .post("/api/ambulances")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      vehicleNumber,
      type: "basic",
      capacity: 1,
      currentLocation: { latitude: lat, longitude: lng },
      driver: { name: "Driver " + vehicleNumber, phone: "9" + Math.floor(100000000 + Math.random() * 899999999), licenseNo: "LIC-" + vehicleNumber, email: driverEmail, password: driverPassword },
    });
  const ambulance = res.body.data;
  if (status && status !== "available") {
    await request(app).put(`/api/ambulances/${ambulance._id}`).set("Authorization", `Bearer ${adminToken}`).send({ status });
  }
  return ambulance;
}

describe("Automated dispatch engine", () => {
  test("auto-assigns a nearby already-available ambulance with no driver cascade", async () => {
    const patient = await signupPatient("patient-autoassign@test.local");
    const admin = await signupAdmin("admin-autoassign@test.local");

    await Hospital.create({
      name: "Test Civil Hospital",
      address: "Test Address",
      city: "Nabha",
      latitude: 30.3753,
      longitude: 76.1500,
      type: "district",
      facilities: ["Emergency 24/7", "ICU"],
    });

    await createAmbulance(admin.token, { vehicleNumber: "AUTO-1", lat: 30.3753, lng: 76.15, driverEmail: "auto1@test.local", driverPassword: "driverpass1" });

    const created = await request(app)
      .post("/api/emergencies")
      .set("Authorization", `Bearer ${patient.token}`)
      .send({ emergencyType: "medical", severity: "high", latitude: 30.376, longitude: 76.151, title: "Fall injury" });
    expect(created.status).toBe(201);
    const emergencyId = created.body.data._id;

    await wait(500);

    const list = await request(app).get("/api/emergencies").set("Authorization", `Bearer ${admin.token}`);
    const emergency = list.body.data.find((e) => e._id === emergencyId);
    expect(emergency.dispatchStatus).toBe("dispatched");
    expect(emergency.assignedVehicle).toBeTruthy();
    expect(emergency.selectedHospital).toBeTruthy();

    const log = await request(app).get(`/api/emergencies/${emergencyId}/dispatch-log`).set("Authorization", `Bearer ${admin.token}`);
    expect(log.body.data.length).toBe(1);
    expect(log.body.data[0].status).toBe("accepted");
  });

  test("cascades through drivers on timeout, then lets a later driver accept via the app", async () => {
    const patient = await signupPatient("patient-cascade@test.local");
    const admin = await signupAdmin("admin-cascade@test.local");

    // Both ambulances marked "busy" so neither is auto-assigned directly —
    // this forces the engine into the call-the-driver cascade path.
    await createAmbulance(admin.token, { vehicleNumber: "CASC-1", status: "busy", lat: 30.376, lng: 76.152, driverEmail: "casc1@test.local", driverPassword: "driverpass1" });
    await createAmbulance(admin.token, { vehicleNumber: "CASC-2", status: "busy", lat: 30.4, lng: 76.2, driverEmail: "casc2@test.local", driverPassword: "driverpass2" });

    const created = await request(app)
      .post("/api/emergencies")
      .set("Authorization", `Bearer ${patient.token}`)
      .send({ emergencyType: "medical", severity: "medium", latitude: 30.3753, longitude: 76.15, title: "Fever" });
    const emergencyId = created.body.data._id;

    // First driver never responds -> after ~1s it should time out and move to driver 2.
    await wait(1600);

    const login2 = await request(app).post("/api/auth/login").send({ email: "casc2@test.local", password: "driverpass2" });
    expect(login2.body.data.user.role).toBe("driver");

    const log1 = await request(app).get(`/api/emergencies/${emergencyId}/dispatch-log`).set("Authorization", `Bearer ${admin.token}`);
    expect(log1.body.data.length).toBe(2);
    expect(log1.body.data[0].status).toBe("timeout");
    const secondAttempt = log1.body.data[1];
    expect(secondAttempt.status).toBe("ringing");

    const respond = await request(app)
      .post(`/api/driver/jobs/${secondAttempt._id}/respond`)
      .set("Authorization", `Bearer ${login2.body.data.token}`)
      .send({ decision: "accept" });
    expect(respond.status).toBe(200);

    await wait(300);

    const finalEmergency = await request(app).get(`/api/emergencies`).set("Authorization", `Bearer ${admin.token}`);
    const emergency = finalEmergency.body.data.find((e) => e._id === emergencyId);
    expect(emergency.dispatchStatus).toBe("dispatched");
    expect(emergency.assignedVehicle.vehicleNumber).toBe("CASC-2");

    const finalLog = await request(app).get(`/api/emergencies/${emergencyId}/dispatch-log`).set("Authorization", `Bearer ${admin.token}`);
    const acceptedAttempt = finalLog.body.data.find((a) => a.status === "accepted");
    expect(acceptedAttempt.respondedVia).toBe("app");
  });

  test("escalates to the control room when no ambulances or drivers are registered at all", async () => {
    const patient = await signupPatient("patient-escalate@test.local");
    const admin = await signupAdmin("admin-escalate@test.local");

    const created = await request(app)
      .post("/api/emergencies")
      .set("Authorization", `Bearer ${patient.token}`)
      .send({ emergencyType: "medical", severity: "low", latitude: 30.3753, longitude: 76.15 });
    const emergencyId = created.body.data._id;

    await wait(300);

    const list = await request(app).get("/api/emergencies").set("Authorization", `Bearer ${admin.token}`);
    const emergency = list.body.data.find((e) => e._id === emergencyId);
    expect(emergency.escalatedToControlRoom).toBe(true);
    expect(emergency.assignedVehicle).toBeFalsy();
  });

  test("a driver cannot respond to another driver's dispatch offer", async () => {
    const patient = await signupPatient("patient-idor@test.local");
    const admin = await signupAdmin("admin-idor@test.local");

    await createAmbulance(admin.token, { vehicleNumber: "IDOR-1", status: "busy", lat: 30.376, lng: 76.152, driverEmail: "idor1@test.local", driverPassword: "driverpass1" });
    await createAmbulance(admin.token, { vehicleNumber: "IDOR-2", status: "busy", lat: 30.5, lng: 76.3, driverEmail: "idor2@test.local", driverPassword: "driverpass2" });

    const created = await request(app)
      .post("/api/emergencies")
      .set("Authorization", `Bearer ${patient.token}`)
      .send({ emergencyType: "medical", severity: "medium", latitude: 30.3753, longitude: 76.15 });
    const emergencyId = created.body.data._id;

    await wait(300);
    const log = await request(app).get(`/api/emergencies/${emergencyId}/dispatch-log`).set("Authorization", `Bearer ${admin.token}`);
    const attempt = log.body.data[0];

    const wrongDriverLogin = await request(app).post("/api/auth/login").send({ email: "idor2@test.local", password: "driverpass2" });
    const respond = await request(app)
      .post(`/api/driver/jobs/${attempt._id}/respond`)
      .set("Authorization", `Bearer ${wrongDriverLogin.body.data.token}`)
      .send({ decision: "accept" });
    expect(respond.status).toBe(403);

    // Have the correct driver resolve the offer so no cascade timer is left
    // dangling past this file's teardown (disconnectTestDB below).
    const rightDriverLogin = await request(app).post("/api/auth/login").send({ email: "idor1@test.local", password: "driverpass1" });
    await request(app)
      .post(`/api/driver/jobs/${attempt._id}/respond`)
      .set("Authorization", `Bearer ${rightDriverLogin.body.data.token}`)
      .send({ decision: "accept" });
    await wait(200);
  });
});
