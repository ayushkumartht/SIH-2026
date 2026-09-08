import request from "supertest";
import app from "../app.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./dbSetup.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
// Creating an emergency fires the dispatch engine in the background (it
// doesn't block the API response). Give it a moment to finish before the DB
// connection is torn down, so a straggling query doesn't fail after close.
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  await disconnectTestDB();
});

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

describe("Emergency dispatch", () => {
  test("full lifecycle: create -> suggest -> assign -> status progression", async () => {
    const patient = await signupPatient("patient-emergency@test.local");
    const admin = await signupAdmin("admin-emergency@test.local");

    const created = await request(app)
      .post("/api/emergencies")
      .set("Authorization", `Bearer ${patient.token}`)
      .send({
        emergencyType: "medical",
        severity: "critical",
        latitude: 30.376,
        longitude: 76.151,
        title: "Test emergency",
        details: "Chest pain",
      });
    expect(created.status).toBe(201);
    const emergencyId = created.body.data._id;

    const ambulance = await request(app)
      .post("/api/ambulances")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        vehicleNumber: "TEST-AMB-1",
        type: "basic",
        capacity: 1,
        currentLocation: { latitude: 30.377, longitude: 76.152 },
        driver: { name: "Test Driver", phone: "9444444444", licenseNo: "TEST-LIC-1" },
      });
    expect(ambulance.status).toBe(201);

    const suggestions = await request(app)
      .get(`/api/emergencies/${emergencyId}/suggest-ambulances`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(suggestions.status).toBe(200);
    expect(suggestions.body.data.length).toBeGreaterThan(0);
    const vehicleId = suggestions.body.data[0]._id;

    const assign = await request(app)
      .put(`/api/emergencies/${emergencyId}/assign-vehicle`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ vehicleId });
    expect(assign.status).toBe(200);
    expect(assign.body.data.dispatchStatus).toBe("vehicle_assigned");

    const dispatched = await request(app)
      .put(`/api/emergencies/${emergencyId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "dispatched" });
    expect(dispatched.status).toBe(200);
    expect(dispatched.body.data.dispatchStatus).toBe("dispatched");

    // Illegal transition: cannot jump straight from "dispatched" to "closed"
    const illegal = await request(app)
      .put(`/api/emergencies/${emergencyId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "closed" });
    expect(illegal.status).toBe(409);
  });

  test("a patient cannot see another patient's emergencies", async () => {
    const patientA = await signupPatient("patientA-emvis@test.local");
    const patientB = await signupPatient("patientB-emvis@test.local");

    await request(app)
      .post("/api/emergencies")
      .set("Authorization", `Bearer ${patientA.token}`)
      .send({ emergencyType: "medical", severity: "low", latitude: 30.3, longitude: 76.1 });

    const list = await request(app)
      .get("/api/emergencies")
      .set("Authorization", `Bearer ${patientB.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(0);
  });
});
