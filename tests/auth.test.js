import request from "supertest";
import app from "../app.js";
import { connectTestDB, clearTestDB, disconnectTestDB } from "./dbSetup.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("Authentication", () => {
  test("patient can sign up and log in", async () => {
    const signup = await request(app).post("/api/auth/patient/signup").send({
      name: "Test Patient",
      email: "patient1@test.local",
      password: "password123",
      age: 30,
      gender: "female",
      contact: "9999999999",
    });
    expect(signup.status).toBe(201);
    expect(signup.body.data.token).toBeTruthy();
    expect(signup.body.data.user.role).toBe("patient");

    const login = await request(app).post("/api/auth/patient/login").send({
      email: "patient1@test.local",
      password: "password123",
    });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeTruthy();
  });

  test("doctor can sign up and log in", async () => {
    const signup = await request(app).post("/api/auth/signup").send({
      name: "Dr. Test",
      email: "doctor1@test.local",
      password: "password123",
      role: "doctor",
      mobile: "8888888888",
      specialization: "General Physician",
    });
    expect(signup.status).toBe(201);
    expect(signup.body.data.user.role).toBe("doctor");

    const login = await request(app).post("/api/auth/login").send({
      email: "doctor1@test.local",
      password: "password123",
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe("doctor");
  });

  test("asha worker can sign up and log in via the staff signup path", async () => {
    const signup = await request(app).post("/api/auth/signup").send({
      name: "Asha Test",
      email: "asha1@test.local",
      password: "password123",
      role: "asha",
    });
    expect(signup.status).toBe(201);
    expect(signup.body.data.user.role).toBe("asha");

    const login = await request(app).post("/api/auth/login").send({
      email: "asha1@test.local",
      password: "password123",
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe("asha");
  });

  test("wrong password is rejected", async () => {
    await request(app).post("/api/auth/patient/signup").send({
      name: "Test Patient 2",
      email: "patient2@test.local",
      password: "password123",
      age: 25,
      gender: "male",
      contact: "9999999998",
    });
    const login = await request(app).post("/api/auth/patient/login").send({
      email: "patient2@test.local",
      password: "wrongpassword",
    });
    expect(login.status).toBe(401);
  });
});
