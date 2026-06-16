import prisma from "../lib/prisma";
import { createTestData, generateTestToken } from "./helper";

describe("Debug test", () => {
  it("should debug the test data creation", async () => {
    const testData = await createTestData();
    console.log("Test data created:", {
      countryId: testData.country.id,
      stateId: testData.state.id,
      cityId: testData.city.id,
      localityId: testData.locality.id,
      builderId: testData.builder.id,
      projectId: testData.project.id,
      userId: testData.user.id,
      propertyId: testData.property.id,
    });
    
    const token = generateTestToken(testData.user.id);
    console.log("Token generated for user:", testData.user.id);
    console.log("Token:", token.substring(0, 50) + "...");
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: testData.user.id }
    });
    console.log("User found in DB:", user);
    
    expect(testData.user.id).toBeDefined();
  });
});