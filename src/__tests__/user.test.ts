import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { createTestData, cleanTestData, generateTestToken } from "./helper";

let testData: Awaited<ReturnType<typeof createTestData>>;
let adminToken: string;

beforeAll(async () => {
  testData = await createTestData();
  adminToken = generateTestToken(testData.user.id, "ADMIN");
});

beforeEach(async () => {
  await cleanTestData();
});

describe("POST /users", () => {
  it("should reject unauthenticated requests", async () => {
    const res = await request(app).post("/users").send({
      phone: "9888888801",
      name: "Buyer One",
    });

    expect(res.status).toBe(401);
  });

  it("should create a BUYER without an agent profile", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        phone: "9888888801",
        name: "Buyer One",
        role: "BUYER",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("BUYER");
    expect(res.body.data.agent).toBeNull();
  });

  it("should create a user and agent profile when role is AGENT", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        phone: "9888888802",
        name: "Agent One",
        role: "AGENT",
        agencyName: "Samriddh Realty",
        reraNumber: "WBRERA/TEST/001",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("AGENT");
    expect(res.body.data.agent.agencyName).toBe("Samriddh Realty");
  });

  it("should promote an existing buyer to agent by phone", async () => {
    await prisma.user.create({
      data: { phone: "9888888803", name: "Existing Buyer", role: "BUYER" },
    });

    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        phone: "9888888803",
        name: "Existing Buyer",
        role: "AGENT",
        agencyName: "Promoted Agency",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("AGENT");
    expect(res.body.data.agent).toBeTruthy();
  });
});
