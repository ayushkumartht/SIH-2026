import request from "supertest";
import app from "../app.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./dbSetup.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

async function signupAsha(email) {
  const res = await request(app).post("/api/auth/signup").send({
    name: "Asha " + email,
    email,
    password: "password123",
    role: "asha",
  });
  return res.body.data;
}

describe("ASHA field worker", () => {
  test("registering a patient without recorded consent is rejected", async () => {
    const asha = await signupAsha("asha-consent@test.local");
    const res = await request(app)
      .post("/api/asha/patients")
      .set("Authorization", `Bearer ${asha.token}`)
      .send({ name: "Field Patient", age: 40, gender: "male", village: "Sanaur", consent: false });
    expect(res.status).toBe(400);
  });

  test("registering a patient with consent succeeds", async () => {
    const asha = await signupAsha("asha-consent2@test.local");
    const res = await request(app)
      .post("/api/asha/patients")
      .set("Authorization", `Bearer ${asha.token}`)
      .send({ name: "Field Patient", age: 40, gender: "male", village: "Sanaur", consent: true });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Field Patient");
  });

  test("location update without consent is rejected", async () => {
    const asha = await signupAsha("asha-location@test.local");
    const created = await request(app)
      .post("/api/asha/patients")
      .set("Authorization", `Bearer ${asha.token}`)
      .send({ name: "Field Patient 2", age: 35, gender: "female", village: "Bhadson", consent: true });
    const patientId = created.body.data.id;

    const rejected = await request(app)
      .patch(`/api/asha/patients/${patientId}/location`)
      .set("Authorization", `Bearer ${asha.token}`)
      .send({ latitude: 30.37, longitude: 76.15, consent: false });
    expect(rejected.status).toBe(400);

    const accepted = await request(app)
      .patch(`/api/asha/patients/${patientId}/location`)
      .set("Authorization", `Bearer ${asha.token}`)
      .send({ latitude: 30.37, longitude: 76.15, consent: true });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.latitude).toBe(30.37);
  });
});
