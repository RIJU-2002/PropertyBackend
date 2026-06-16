import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { createTestData, generateTestToken, cleanTestData } from "./helper";

// ============================================================
// LEAD / ENQUIRY TESTS
// ============================================================

let testData: Awaited<ReturnType<typeof createTestData>>;
let token: string;
let agentToken: string;

// beforeAll(async () => {
//   testData = await createTestData();
//   token    = generateTestToken(testData.user.id);
//   token = generateTestToken(testData.user.id, "ADMIN"); // role = "ADMIN"
// });

// beforeEach(async () => {
//   await cleanTestData();
// });
beforeEach(async () => {
  await cleanTestData();

  testData = await createTestData();

  token = generateTestToken(testData.user.id, "ADMIN");

  agentToken = generateTestToken(testData.agentUser.id, "AGENT");
});

// ============================================================
// POST /leads — submit enquiry
// ============================================================

describe("POST /leads — guest enquiry", () => {
  it("should submit a guest lead for a property", async () => {
    const res = await request(app)
      .post("/lead")
      .send({
        propertyId:    testData.property.id,
        guestName:     "Amit Kumar",
        guestPhone:    "9111111111",
        message:       "Interested in this property",
        budget:        "9000000",
        bhkPreference: [3],
        source:        "listing_page",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/enquiry submitted/i);
    expect(res.body.data.guestPhone).toBe("9111111111");
    expect(res.body.data.status).toBe("NEW");
  });

  it("should submit a guest lead for a project", async () => {
    const res = await request(app)
      .post("/lead")
      .send({
        projectId:     testData.project.id,
        guestPhone:    "9111111112",
        bhkPreference: [2, 3],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projectId).toBe(testData.project.id);
  });

  it("should require guestPhone when not logged in", async () => {
    const res = await request(app)
      .post("/lead")
      .send({
        propertyId: testData.property.id,
        guestName:  "No Phone User",
        // guestPhone missing
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/phone/i);
  });

  it("should reject invalid phone format", async () => {
    const res = await request(app)
      .post("/lead")
      .send({
        propertyId: testData.property.id,
        guestPhone: "12345", // too short
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject lead with no propertyId or projectId", async () => {
    const res = await request(app)
      .post("/lead")
      .send({
        guestPhone: "9111111113",
        message:    "Where is the property?",
        // both propertyId and projectId missing
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/property or project/i);
  });

  it("should reject duplicate lead within 24 hours", async () => {
    const payload = {
      propertyId: testData.property.id,
      guestPhone: "9111111114",
      message:    "First enquiry",
    };

    // First lead — should succeed
    const first = await request(app).post("/lead").send(payload);
    expect(first.status).toBe(201);

    // Second lead — same phone + same property = duplicate
    const second = await request(app).post("/lead").send(payload);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already enquired/i);
  });

  it("should allow same phone to enquire about different properties", async () => {
    // Create a second property
    const prop2 = await prisma.property.create({
      data: {
        title:           "Second Test Property",
        slug:            "second-test-property-abc1",
        propertyType:    "VILLA",
        listingType:     "BUY",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        price:           7000000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "UNFURNISHED",
        ownerId:         testData.user.id,
        isActive:        true,
      },
    });

    const phone = "9111111115";

    const first = await request(app).post("/lead").send({
      propertyId: testData.property.id,
      guestPhone: phone,
    });

    const second = await request(app).post("/lead").send({
      propertyId: prop2.id,
      guestPhone: phone,   // same phone, different property
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201); // allowed — different property
  });

  it("should reject lead for inactive property", async () => {
    const inactiveProp = await prisma.property.create({
      data: {
        title:           "Inactive Prop",
        slug:            "inactive-prop-test-zz99",
        propertyType:    "APARTMENT",
        listingType:     "BUY",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        price:           5000000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "UNFURNISHED",
        ownerId:         testData.user.id,
        isActive:        false, // ← inactive
      },
    });

    const res = await request(app)
      .post("/lead")
      .send({
        propertyId: inactiveProp.id,
        guestPhone: "9111111116",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no longer active/i);
  });
});

describe("POST /leads — logged-in user enquiry", () => {
  it("should submit lead without guest fields when logged in", async () => {
    const res = await request(app)
      .post("/lead")
      .set("Authorization", `Bearer ${token}`)
      .send({
        propertyId: testData.property.id,
        message:    "Please schedule a site visit",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.buyerId).toBe(testData.user.id);
    expect(res.body.data.guestPhone).toBeNull();
  });

  it("should set budget as string in response (BigInt safe)", async () => {
    const res = await request(app)
      .post("/lead")
      .set("Authorization", `Bearer ${token}`)
      .send({
        propertyId: testData.property.id,
        budget:     "9000000",
      });

    expect(res.status).toBe(201);
    if (res.body.data.budget) {
      expect(typeof res.body.data.budget).toBe("string");
    }
  });
});

// ============================================================
// GET /leads/my — buyer's own leads
// ============================================================

describe("GET /lead/my", () => {
  it("should return leads for logged-in buyer", async () => {
    // Create a lead first
    await prisma.lead.create({
      data: {
        buyerId:    testData.user.id,
        propertyId: testData.property.id,
        status:     "NEW",
      },
    });

    const res = await request(app)
      .get("/lead/my")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.leads)).toBe(true);
    expect(res.body.leads.length).toBeGreaterThanOrEqual(1);
    res.body.leads.forEach((l: any) => {
      expect(l.buyerId).toBe(testData.user.id);
    });
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/lead/my");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return empty array when no leads exist", async () => {
    // cleanTestData already cleared leads in beforeEach
    const res = await request(app)
      .get("/lead/my")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.leads).toHaveLength(0);
  });

  it("should include property details in response", async () => {
    await prisma.lead.create({
      data: {
        buyerId:    testData.user.id,
        propertyId: testData.property.id,
        status:     "NEW",
      },
    });

    const res = await request(app)
      .get("/lead/my")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.leads[0].property).toBeDefined();
    expect(res.body.leads[0].property.title).toBeDefined();
  });
});

// ============================================================
// PATCH /leads/:id/status — update lead status
// ============================================================

describe("PATCH /lead/:id/status", () => {
  // let agentToken: string;

  // beforeAll(() => {
  //   agentToken = generateTestToken(testData.agent.id, "AGENT");
  // });

  it("should update lead status", async () => {
    const lead = await prisma.lead.create({
      data: {
        buyerId:    testData.user.id,
        propertyId: testData.property.id,
        agentId:    testData.agent.id,
        status:     "NEW",
      },
    });

    const res = await request(app)
      .patch(`/lead/${lead.id}/status`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({
        status: "CONTACTED",
        notes: "Called the buyer",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("CONTACTED");
    expect(res.body.data.notes).toBe("Called the buyer");
  });

  it("should reject invalid status value", async () => {
    const lead = await prisma.lead.create({
      data: {
        buyerId:    testData.user.id,
        propertyId: testData.property.id,
        agentId:    testData.agent.id,
        status:     "NEW",
      },
    });

    const res = await request(app)
      .patch(`/lead/${lead.id}/status`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ status: "INVALID_STATUS" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 for non-existent lead", async () => {
    const res = await request(app)
      .patch("/lead/99999/status")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ status: "CONTACTED" });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("should return 400 for invalid lead ID", async () => {
    const res = await request(app)
      .patch("/lead/abc/status")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ status: "CONTACTED" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid lead id/i);
  });

  it("should update followUpAt when provided", async () => {
    const lead = await prisma.lead.create({
      data: {
        buyerId:    testData.user.id,
        propertyId: testData.property.id,
        agentId:    testData.agent.id,
        status:     "NEW",
      },
    });

    const followUp = "2026-06-01T10:00:00.000Z";

    const res = await request(app)
      .patch(`/lead/${lead.id}/status`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({
        status: "SITE_VISIT_SCHEDULED",
        followUpAt: followUp,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.followUpAt).toBeDefined();
  });
});