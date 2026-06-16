import prisma from "../lib/prisma";

// ============================================================
// GLOBAL TEST SETUP
// Runs once before ALL test files
// ============================================================

beforeAll(async () => {
  // Make sure we're using the TEST database
  // This is a safety check — prevents running tests against production
  const dbUrl = process.env.DATABASE_URL ?? "";

  if (!dbUrl.includes("test") && !dbUrl.includes("neon")) {
    throw new Error(
      "TEST ABORTED: DATABASE_URL does not look like a test database.\n" +
      "Set TEST_DATABASE_URL in your .env.test file."
    );
  }

  // Clean all tables before the test suite runs
  // Order matters — delete children before parents
  await prisma.lead.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.savedProject.deleteMany();
  await prisma.recentlyViewed.deleteMany();
  await prisma.projectReview.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.projectImage.deleteMany();
  await prisma.floorPlan.deleteMany();
  await prisma.nearbyPlace.deleteMany();
  await prisma.projectAmenity.deleteMany();
  await prisma.property.deleteMany();
  await prisma.project.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.user.deleteMany();
  await prisma.locality.deleteMany();
  await prisma.city.deleteMany();
  await prisma.state.deleteMany();
  await prisma.country.deleteMany();
  await prisma.builder.deleteMany();

  console.log("✅ Test database cleaned");
});

afterAll(async () => {
  await prisma.$disconnect();
});