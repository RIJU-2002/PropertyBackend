import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { createTestData, generateTestToken, cleanTestData } from "./helper";

// ============================================================
// PROPERTY TESTS
// ============================================================

let testData: Awaited<ReturnType<typeof createTestData>>;
let token: string;

beforeAll(async () => {
  testData = await createTestData();
  //token    = generateTestToken(testData.user.id);
  token = generateTestToken(testData.user.id, "ADMIN"); // role = "ADMIN"
});

beforeEach(async () => {
  await cleanTestData();
});

// ============================================================
// GET /properties — search & filters
// ============================================================

describe("GET /properties", () => {
  it("should return all active properties", async () => {
    const res = await request(app).get("/properties");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.properties)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("should filter by city slug", async () => {
    const res = await request(app).get("/properties?city=bhubaneswar");

    expect(res.status).toBe(200);
    expect(res.body.properties.length).toBeGreaterThanOrEqual(1);
    res.body.properties.forEach((p: any) => {
      expect(p.city.slug).toBe("bhubaneswar");
    });
  });

  it("should filter by locality slug", async () => {
    const res = await request(app).get("/properties?locality=patia");

    expect(res.status).toBe(200);
    res.body.properties.forEach((p: any) => {
      expect(p.locality.slug).toBe("patia");
    });
  });

  it("should filter by single BHK", async () => {
    const res = await request(app).get("/properties?bhk=3");

    expect(res.status).toBe(200);
    res.body.properties.forEach((p: any) => {
      expect(p.bhk).toBe(3);
    });
  });

  it("should filter by multiple BHK comma-separated", async () => {
    // Create a 2 BHK property for this test
    await prisma.property.create({
      data: {
        title:           "Test 2 BHK",
        slug:            "test-2bhk-patia-x1y2",
        propertyType:    "APARTMENT",
        listingType:     "BUY",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        bhk:             2,
        price:           5000000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "UNFURNISHED",
        ownerId:         testData.user.id,
        isActive:        true,
      },
    });

    const res = await request(app).get("/properties?bhk=2,3");

    expect(res.status).toBe(200);
    expect(res.body.properties.length).toBeGreaterThanOrEqual(2);
    res.body.properties.forEach((p: any) => {
      expect([2, 3]).toContain(p.bhk);
    });
  });

  it("should return empty array for bhk with no matches", async () => {
    const res = await request(app).get("/properties?bhk=1");

    expect(res.status).toBe(200);
    expect(res.body.properties).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it("should filter by listingType BUY", async () => {
    const res = await request(app).get("/properties?listingType=BUY");

    expect(res.status).toBe(200);
    res.body.properties.forEach((p: any) => {
      expect(p.listingType).toBe("BUY");
    });
  });

  it("should filter by listingType RENT", async () => {
    // Create a rent property
    await prisma.property.create({
      data: {
        title:           "Test Rent Flat",
        slug:            "test-rent-flat-patia-a1b2",
        propertyType:    "APARTMENT",
        listingType:     "RENT",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        bhk:             2,
        price:           15000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "FULLY_FURNISHED",
        ownerId:         testData.user.id,
        isActive:        true,
      },
    });

    const res = await request(app).get("/properties?listingType=RENT");

    expect(res.status).toBe(200);
    expect(res.body.properties.length).toBeGreaterThanOrEqual(1);
    res.body.properties.forEach((p: any) => {
      expect(p.listingType).toBe("RENT");
    });
  });

  it("should filter by price range", async () => {
    const res = await request(app).get(
      "/properties?minPrice=7000000&maxPrice=9000000"
    );

    expect(res.status).toBe(200);
    res.body.properties.forEach((p: any) => {
      const price = Number(p.price);
      expect(price).toBeGreaterThanOrEqual(7000000);
      expect(price).toBeLessThanOrEqual(9000000);
    });
  });

  it("should filter by furnishingStatus", async () => {
    const res = await request(app).get(
      "/properties?furnishingStatus=SEMI_FURNISHED"
    );

    expect(res.status).toBe(200);
    res.body.properties.forEach((p: any) => {
      expect(p.furnishingStatus).toBe("SEMI_FURNISHED");
    });
  });

  it("should sort by price ascending", async () => {
    const res = await request(app).get("/properties?sort=price_asc");

    expect(res.status).toBe(200);
    const prices = res.body.properties.map((p: any) => Number(p.price));
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  it("should sort by price descending", async () => {
    const res = await request(app).get("/properties?sort=price_desc");

    expect(res.status).toBe(200);
    const prices = res.body.properties.map((p: any) => Number(p.price));
    const sorted = [...prices].sort((a, b) => b - a);
    expect(prices).toEqual(sorted);
  });

  it("should paginate correctly", async () => {
    const res = await request(app).get("/properties?page=1&limit=1");

    expect(res.status).toBe(200);
    expect(res.body.properties).toHaveLength(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.page).toBe(1);
  });

  it("should not exceed limit of 50", async () => {
    const res = await request(app).get("/properties?limit=999");

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBeLessThanOrEqual(50);
  });

  it("should not return inactive properties", async () => {
    // Create an inactive property
    await prisma.property.create({
      data: {
        title:           "Inactive Property",
        slug:            "inactive-property-test-z9z9",
        propertyType:    "APARTMENT",
        listingType:     "BUY",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        bhk:             3,
        price:           5000000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "UNFURNISHED",
        ownerId:         testData.user.id,
        isActive:        false, // ← inactive
      },
    });

    const res = await request(app).get("/properties");

    expect(res.status).toBe(200);
    res.body.properties.forEach((p: any) => {
      expect(p.isActive).not.toBe(false);
    });
  });

  it("should return correct pagination metadata", async () => {
    const res = await request(app).get("/properties?page=1&limit=1");

    expect(res.body.pagination).toMatchObject({
      page:      1,
      limit:     1,
      totalPages: expect.any(Number),
      hasNext:   expect.any(Boolean),
      hasPrev:   false,
    });
  });
});

// ============================================================
// GET /properties/:slug — single property
// ============================================================

// describe("GET /properties/:slug", () => {
//   it("should return full property detail by slug", async () => {
//     const res = await request(app).get(
//       `/properties/${testData.property.slug}`
//     );

//     expect(res.status).toBe(200);
//     expect(res.body.success).toBe(true);
//     expect(res.body.data.slug).toBe(testData.property.slug);
//     expect(res.body.data.city).toBeDefined();
//     expect(res.body.data.locality).toBeDefined();
//   });

//   it("should return 404 for non-existent slug", async () => {
//     const res = await request(app).get("/properties/slug-that-does-not-exist");

//     expect(res.status).toBe(404);
//     expect(res.body.success).toBe(false);
//     expect(res.body.message).toMatch(/not found/i);
//   });

//   it("should increment viewCount on each fetch", async () => {
//     const before = await prisma.property.findUnique({
//       where:  { slug: testData.property.slug },
//       select: { viewCount: true },
//     });

//     await request(app).get(`/properties/${testData.property.slug}`);

//     // Wait briefly for background update
//     await new Promise((r) => setTimeout(r, 300));

//     const after = await prisma.property.findUnique({
//       where:  { slug: testData.property.slug },
//       select: { viewCount: true },
//     });

//     expect(after!.viewCount).toBeGreaterThan(before!.viewCount);
//   });

//   it("should serialize price as string not number", async () => {
//     const res = await request(app).get(
//       `/properties/${testData.property.slug}`
//     );

//     expect(typeof res.body.data.price).toBe("string");
//   });
// });

// ============================================================
// POST /properties — create property
// ============================================================

describe("POST /properties", () => {
  it("should create a property with valid data", async () => {
    const res = await request(app)
      .post("/properties")
      .set("Authorization", `Bearer ${token}`)
      .field("title",           "Brand New 2 BHK Apartment")
      .field("propertyType",    "APARTMENT")
      .field("listingType",     "BUY")
      .field("cityId",          String(testData.city.id))
      .field("localityId",      String(testData.locality.id))
      .field("bhk",             "2")
      .field("bathrooms",       "2")
      .field("price",           "5500000")
      .field("furnishingStatus","UNFURNISHED")
      .field("possessionStatus","READY_TO_MOVE")
      .field("features",        '["Gym","Parking"]')
      .field("overlooking",     '["Garden"]');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBeDefined();
    expect(typeof res.body.data.price).toBe("string");
  });

  it("should auto-generate slug — never accept slug from client", async () => {
    const res = await request(app)
      .post("/properties")
      .set("Authorization", `Bearer ${token}`)
      .field("title",           "Slug Test Apartment")
      .field("propertyType",    "APARTMENT")
      .field("listingType",     "BUY")
      .field("cityId",          String(testData.city.id))
      .field("localityId",      String(testData.locality.id))
      .field("price",           "6000000")
      .field("furnishingStatus","UNFURNISHED")
      .field("possessionStatus","READY_TO_MOVE")
      .field("features",        "[]")
      .field("overlooking",     "[]");

    expect(res.status).toBe(201);
    // Slug should contain the title words, not a client-provided value
    expect(res.body.data.slug).toContain("slug-test");
  });

  it("should return 401 without auth token", async () => {
    const res = await request(app)
      .post("/properties")
      .field("title", "Unauthorized Property")
      .field("price", "5000000");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 for invalid cityId", async () => {
    const res = await request(app)
      .post("/properties")
      .set("Authorization", `Bearer ${token}`)
      .field("title",           "Bad City Property")
      .field("propertyType",    "APARTMENT")
      .field("listingType",     "BUY")
      .field("cityId",          "99999") // non-existent
      .field("localityId",      String(testData.locality.id))
      .field("price",           "5000000")
      .field("furnishingStatus","UNFURNISHED")
      .field("possessionStatus","READY_TO_MOVE")
      .field("features",        "[]")
      .field("overlooking",     "[]");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/city/i);
  });

  it("should return 400 when title is too short", async () => {
    const res = await request(app)
      .post("/properties")
      .set("Authorization", `Bearer ${token}`)
      .field("title",        "Short") // less than 10 chars
      .field("propertyType", "APARTMENT")
      .field("listingType",  "BUY")
      .field("cityId",       String(testData.city.id))
      .field("localityId",   String(testData.locality.id))
      .field("price",        "5000000");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });
});

// ============================================================
// PATCH /properties/:id — update property
// ============================================================

describe("PATCH /properties/:id", () => {
  it("should update allowed fields", async () => {
    const res = await request(app)
      .patch(`/properties/${testData.property.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated description for testing purposes." });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app)
      .patch(`/properties/${testData.property.id}`)
      .send({ description: "No auth" });

    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid property ID", async () => {
    const res = await request(app)
      .patch("/properties/abc")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Bad ID" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid property id/i);
  });
});

// ============================================================
// DELETE /properties/:id — soft delete
// ============================================================

describe("DELETE /properties/:id", () => {
  it("should soft delete a property (set isActive false)", async () => {
    // Create a property to delete
    const prop = await prisma.property.create({
      data: {
        title:           "Property To Delete",
        slug:            "property-to-delete-test",
        propertyType:    "APARTMENT",
        listingType:     "BUY",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        price:           5000000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "UNFURNISHED",
        ownerId:         testData.user.id,
        isActive:        true,
      },
    });

    const res = await request(app)
      .delete(`/properties/${prop.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm isActive is now false in DB
    const deleted = await prisma.property.findUnique({ where: { id: prop.id } });
    expect(deleted?.isActive).toBe(false);
  });

  it("should not appear in search results after deletion", async () => {
    const prop = await prisma.property.create({
      data: {
        title:           "Property To Hide",
        slug:            "property-to-hide-test",
        propertyType:    "VILLA",
        listingType:     "BUY",
        cityId:          testData.city.id,
        localityId:      testData.locality.id,
        price:           5000000n,
        possessionStatus: "READY_TO_MOVE",
        furnishingStatus: "UNFURNISHED",
        ownerId:         testData.user.id,
        isActive:        true,
      },
    });

    await request(app)
      .delete(`/properties/${prop.id}`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app).get("/properties?propertyType=VILLA");
    const slugs = res.body.properties.map((p: any) => p.slug);
    expect(slugs).not.toContain("property-to-hide-test");
  });
});