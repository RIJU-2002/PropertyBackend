import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";

// ============================================================
// TEST DATA FACTORY
// Creates consistent seed data for each test file
// ============================================================

export const createTestData = async () => {
  // Country → State → City → Locality
  // Use upsert for entities with unique constraints to avoid duplicate errors
  // Update existing records to ensure they match test expectations
  const country = await prisma.country.upsert({
    where: { name: "India" },
    update: { code: "IND" },
    create: { name: "India", code: "IND" },
  });

  const state = await prisma.state.upsert({
    where: { code_countryId: { code: "OD", countryId: country.id } },
    update: { name: "Odisha" },
    create: { name: "Odisha", code: "OD", countryId: country.id },
  });

  const city = await prisma.city.upsert({
    where: { slug: "bhubaneswar" },
    update: { name: "Bhubaneswar", isPopular: true },
    create: { name: "Bhubaneswar", slug: "bhubaneswar", stateId: state.id, isPopular: true },
  });

  const locality = await prisma.locality.upsert({
    where: { slug_cityId: { slug: "patia", cityId: city.id } },
    update: { name: "Patia" },
    create: { name: "Patia", slug: "patia", cityId: city.id },
  });

  // Builder + Project
  const builder = await prisma.builder.upsert({
    where: { slug: "test-builder" },
    update: { name: "Test Builder", isVerified: true },
    create: {
      name:       "Test Builder",
      slug:       "test-builder",
      isVerified: true,
    },
  });

  const project = await prisma.project.upsert({
    where: { slug: "test-project-patia" },
    update: {
      name: "Test Project",
      builderId: builder.id,
      cityId: city.id,
      localityId: locality.id,
      possessionStatus: "READY_TO_MOVE",
      minPrice: 5000000n,
      maxPrice: 9000000n,
    },
    create: {
      name:             "Test Project",
      slug:             "test-project-patia",
      builderId:        builder.id,
      cityId:           city.id,
      localityId:       locality.id,
      possessionStatus: "READY_TO_MOVE",
      minPrice:         5000000n,
      maxPrice:         9000000n,
    },
  });

  // User
  const user = await prisma.user.upsert({
    where: { phone: "+919000000001" },
    update: { name: "Test User", role: "BUYER", isActive: true },
    create: { phone: "+919000000001", name: "Test User", role: "BUYER" },
  });

  // Property
  const property = await prisma.property.upsert({
    where: { slug: "test-3bhk-flat-patia" },
    update: {
      title: "Test 3 BHK Flat",
      propertyType: "APARTMENT",
      listingType: "BUY",
      cityId: city.id,
      localityId: locality.id,
      bhk: 3,
      bathrooms: 2,
      price: 8000000n,
      possessionStatus: "READY_TO_MOVE",
      furnishingStatus: "SEMI_FURNISHED",
      ownerId: user.id,
      isActive: true,
      isVerified: true,
    },
    create: {
      title:           "Test 3 BHK Flat",
      slug:            "test-3bhk-flat-patia",
      propertyType:    "APARTMENT",
      listingType:     "BUY",
      cityId:          city.id,
      localityId:      locality.id,
      bhk:             3,
      bathrooms:       2,
      price:           8000000n,
      possessionStatus: "READY_TO_MOVE",
      furnishingStatus: "SEMI_FURNISHED",
      ownerId:         user.id,
      isActive:        true,
      isVerified:      true,
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { phone: "+919999999999" },
    update: {
      name: "Test Agent",
      role: "AGENT",
      isActive: true,
    },
    create: {
      phone: "+919999999999",
      name: "Test Agent",
      role: "AGENT",
      isActive: true,
    },
  });

  const agent = await prisma.agent.upsert({
    where: { userId: agentUser.id },
    update: {},
    create: {
      userId: agentUser.id,
      isVerified: true,
    },
  });
  return { country, state, city, locality, builder, project, user, property,agent,agentUser };
};

// ============================================================
// GENERATE TEST JWT
// Creates a valid token for a user without going through OTP
// ============================================================

export const generateTestToken = (userId: number, role = "BUYER") => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET ?? "test-secret",
    { expiresIn: "1h" }
  );
};

// ============================================================
// CLEAN BETWEEN TESTS
// Call in beforeEach inside test files that modify data
// ============================================================

export const cleanTestData = async () => {
  // Clean only the data that tests might create/modify
  // Don't delete core test data (country, state, city, locality, builder, project, user, property)
  // as they are referenced by foreign keys in other tests
  await prisma.lead.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.savedProject.deleteMany();
  await prisma.recentlyViewed.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.projectReview.deleteMany();
  await prisma.nearbyPlace.deleteMany();
  await prisma.floorPlan.deleteMany();
  await prisma.projectAmenity.deleteMany();
  await prisma.projectImage.deleteMany();
  await prisma.propertyImage.deleteMany();
  // Clean any additional properties/projects/users that tests might have created
  // but keep the core test data
  await prisma.property.deleteMany({
    where: {
      slug: { not: "test-3bhk-flat-patia" }
    }
  });
  await prisma.project.deleteMany({
    where: {
      slug: { not: "test-project-patia" }
    }
  });
  await prisma.user.deleteMany({
    where: {
      phone: {
        notIn: ["+919000000001", "+919999999999"]
      }
    }
  });
  await prisma.builder.deleteMany({
    where: {
      slug: { not: "test-builder" }
    }
  });
};