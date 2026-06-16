import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { createTestData, cleanTestData } from "./helper";

// ============================================================
// AUTH TESTS
// ============================================================

let testData: Awaited<ReturnType<typeof createTestData>>;

beforeAll(async () => {
  testData = await createTestData();
});

beforeEach(async () => {
  await cleanTestData();
});

// ============================================================
// POST /auth/send-otp
// ============================================================

describe("POST /auth/send-otp", () => {
  it("should send OTP for a valid phone number", async () => {
    const res = await request(app)
      .post("/auth/send-otp")
      .send({ phone: "9000000002" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify OTP was created in DB
    const otp = await prisma.otp.findFirst({
      where: { phone: "9000000002" },
    });
    expect(otp).not.toBeNull();
    expect(otp?.code).toBe("123456"); // mock OTP in dev
  });

  it("should reject an invalid phone number", async () => {
    const res = await request(app)
      .post("/auth/send-otp")
      .send({ phone: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/valid 10-digit/i);
  });

  it("should reject a phone starting with 0-5", async () => {
    const res = await request(app)
      .post("/auth/send-otp")
      .send({ phone: "1234567890" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should invalidate previous OTP when new one is requested", async () => {
    // Send first OTP
    await request(app).post("/auth/send-otp").send({ phone: "9000000003" });

    const firstOtp = await prisma.otp.findFirst({
      where: { phone: "9000000003" },
      orderBy: { createdAt: "desc" },
    });

    // Send second OTP
    await request(app).post("/auth/send-otp").send({ phone: "9000000003" });

    // First OTP should now be expired
    const expiredOtp = await prisma.otp.findUnique({
      where: { id: firstOtp!.id },
    });
    expect(expiredOtp?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// ============================================================
// POST /auth/verify-otp
// ============================================================

describe("POST /auth/verify-otp", () => {
  it("should verify OTP and return JWT for new user", async () => {
    await request(app).post("/auth/send-otp").send({ phone: "9000000004" });

    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000004", code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.phone).toBe("9000000004");
    expect(res.body.user.role).toBe("BUYER");
  });

  it("should return isNewUser false for existing user", async () => {
    // First login — creates user
    await request(app).post("/auth/send-otp").send({ phone: "9000000001" });
    await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000001", code: "123456" });

    // Second login — user already exists
    await request(app).post("/auth/send-otp").send({ phone: "9000000001" });
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000001", code: "123456" });

    expect(res.body.isNewUser).toBe(false);
  });

  it("should reject wrong OTP code", async () => {
    await request(app).post("/auth/send-otp").send({ phone: "9000000005" });

    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000005", code: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it("should reject OTP for wrong phone", async () => {
    await request(app).post("/auth/send-otp").send({ phone: "9000000006" });

    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000007", code: "123456" }); // different phone

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should not allow reusing same OTP twice", async () => {
    await request(app).post("/auth/send-otp").send({ phone: "9000000008" });

    // First verify — should work
    await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000008", code: "123456" });

    // Second verify — same OTP — should fail
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000008", code: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// GET /auth/me
// ============================================================

describe("GET /auth/me", () => {
  it("should return user profile with valid token", async () => {
    // Get a real token
    await request(app).post("/auth/send-otp").send({ phone: "9000000009" });
    const loginRes = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000009", code: "123456" });

    const token = loginRes.body.token;

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.phone).toBeDefined();
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 with invalid token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer invalidtoken123");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});