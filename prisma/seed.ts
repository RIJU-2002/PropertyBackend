import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================================
  // LOCATION
  // ============================================================

  const india = await prisma.country.create({
    data: { name: "India", code: "IND" },
  });

  const odisha = await prisma.state.create({
    data: { name: "Odisha", code: "OD", countryId: india.id },
  });

  const city = await prisma.city.create({
    data: {
      name: "Bhubaneswar",
      slug: "bhubaneswar",
      stateId: odisha.id,
      isPopular: true,
    },
  });

  const [patia, khandagiri] = await Promise.all([
    prisma.locality.create({
      data: {
        name: "Patia",
        slug: "patia",
        cityId: city.id,
        pincode: "751024",
        latitude: 20.3541,
        longitude: 85.8191,
      },
    }),
    prisma.locality.create({
      data: {
        name: "Khandagiri",
        slug: "khandagiri",
        cityId: city.id,
        pincode: "751030",
        latitude: 20.2548,
        longitude: 85.7760,
      },
    }),
  ]);

  console.log("✅ Location data created");

  // ============================================================
  // AMENITIES
  // ============================================================

  const amenities = await Promise.all([
    prisma.amenity.create({ data: { name: "Swimming Pool",   icon: "ti-swimming",       category: "SPORTS"    } }),
    prisma.amenity.create({ data: { name: "Gym",             icon: "ti-barbell",        category: "SPORTS"    } }),
    prisma.amenity.create({ data: { name: "Clubhouse",       icon: "ti-building",       category: "LIFESTYLE" } }),
    prisma.amenity.create({ data: { name: "24/7 Security",   icon: "ti-shield-lock",    category: "SAFETY"    } }),
    prisma.amenity.create({ data: { name: "CCTV",            icon: "ti-camera",         category: "SAFETY"    } }),
    prisma.amenity.create({ data: { name: "Power Backup",    icon: "ti-bolt",           category: "LIFESTYLE" } }),
    prisma.amenity.create({ data: { name: "Landscaped Garden", icon: "ti-plant",        category: "GREEN"     } }),
    prisma.amenity.create({ data: { name: "Children's Play Area", icon: "ti-playground", category: "LIFESTYLE" } }),
  ]);

  console.log("✅ Amenities created");

  // ============================================================
  // BUILDER
  // ============================================================

  const builder = await prisma.builder.create({
    data: {
      name: "Kalinga Constructions",
      slug: "kalinga-constructions",
      description:
        "One of Odisha's most trusted real estate developers with over 15 years of experience delivering quality residential and commercial projects across Bhubaneswar.",
      establishedYear: 2008,
      totalProjects: 12,
      phone: "+91 9876543210",
      email: "info@kalingaconstructions.com",
      isVerified: true,
      overallRating: 4.3,
      ratingCount: 87,
    },
  });

  console.log("✅ Builder created");

  // ============================================================
  // PROJECT 1 — Under construction apartment complex
  // ============================================================

  const project1 = await prisma.project.create({
    data: {
      name: "Kalinga Greenfields",
      slug: "kalinga-greenfields-patia",
      builderId: builder.id,
      cityId: city.id,
      localityId: patia.id,
      address: "Plot 42, Sector 7, Patia, Bhubaneswar - 751024",
      latitude: 20.3541,
      longitude: 85.8191,
      description:
        "Kalinga Greenfields is a premium residential township spread across 8 acres in the heart of Patia. The project offers thoughtfully designed 2 and 3 BHK apartments with world-class amenities and excellent connectivity to IT hubs.",
      minPrice: 4500000n,   // ₹45 Lakh
      maxPrice: 9500000n,   // ₹95 Lakh
      possessionStatus: "UNDER_CONSTRUCTION",
      launchDate: new Date("2023-06-01"),
      possessionDate: new Date("2026-12-31"),
      reraNumber: "RP/03/2023/00421",
      totalUnits: 240,
      totalTowers: 4,
      totalFloors: 12,
      landArea: 8.0,
      isVerified: true,
      isFeatured: true,
      isNewLaunch: false,
      metaTitle: "Kalinga Greenfields Patia Bhubaneswar — 2 & 3 BHK Flats",
      metaDescription:
        "Buy 2 & 3 BHK apartments at Kalinga Greenfields, Patia, Bhubaneswar. Price starts ₹45 Lakh. RERA registered. Possession Dec 2026.",
    },
  });

  // Project 1 images
  await prisma.projectImage.createMany({
    data: [
      { projectId: project1.id, url: "https://placehold.co/800x500?text=Greenfields+Exterior", isCover: true,  sortOrder: 1 },
      { projectId: project1.id, url: "https://placehold.co/800x500?text=Greenfields+Lobby",    isCover: false, sortOrder: 2 },
      { projectId: project1.id, url: "https://placehold.co/800x500?text=Greenfields+Pool",     isCover: false, sortOrder: 3 },
    ],
  });

  // Project 1 amenities
  await prisma.projectAmenity.createMany({
    data: amenities.map((a) => ({
      projectId: project1.id,
      amenityId: a.id,
    })),
  });

  // Project 1 floor plans
  await prisma.floorPlan.createMany({
    data: [
      {
        projectId:   project1.id,
        bhkType:     2,
        name:        "2 BHK Type A",
        carpetArea:  850,
        builtUpArea: 1050,
        superArea:   1200,
        price:       5200000n,
      },
      {
        projectId:   project1.id,
        bhkType:     2,
        name:        "2 BHK Type B",
        carpetArea:  920,
        builtUpArea: 1100,
        superArea:   1280,
        price:       5800000n,
      },
      {
        projectId:   project1.id,
        bhkType:     3,
        name:        "3 BHK Premium",
        carpetArea:  1250,
        builtUpArea: 1500,
        superArea:   1750,
        price:       8500000n,
      },
    ],
  });

  // Project 1 nearby places
  await prisma.nearbyPlace.createMany({
    data: [
      { projectId: project1.id, name: "KIIT University",         category: "education",  distanceKm: 1.2, travelMins: 5  },
      { projectId: project1.id, name: "Patia Big Bazaar",        category: "mall",       distanceKm: 0.8, travelMins: 3  },
      { projectId: project1.id, name: "Sum Hospital",            category: "hospital",   distanceKm: 2.1, travelMins: 8  },
      { projectId: project1.id, name: "Bhubaneswar Airport",     category: "airport",    distanceKm: 6.5, travelMins: 20 },
      { projectId: project1.id, name: "Infosys Bhubaneswar",     category: "it_hub",     distanceKm: 3.0, travelMins: 12 },
    ],
  });

  console.log("✅ Project 1 (Kalinga Greenfields) created");

  // ============================================================
  // PROJECT 2 — Ready to move
  // ============================================================

  const project2 = await prisma.project.create({
    data: {
      name: "Kalinga Heights",
      slug: "kalinga-heights-khandagiri",
      builderId: builder.id,
      cityId: city.id,
      localityId: khandagiri.id,
      address: "NH-16 Bypass, Khandagiri, Bhubaneswar - 751030",
      latitude: 20.2548,
      longitude: 85.7760,
      description:
        "Kalinga Heights offers ready-to-move-in 3 and 4 BHK luxury apartments near Khandagiri with panoramic views of the Khandagiri hills and seamless connectivity to the city.",
      minPrice: 7500000n,
      maxPrice: 16000000n,
      possessionStatus: "READY_TO_MOVE",
      launchDate: new Date("2020-01-01"),
      possessionDate: new Date("2023-06-30"),
      reraNumber: "RP/03/2020/00189",
      totalUnits: 96,
      totalTowers: 2,
      totalFloors: 15,
      landArea: 3.5,
      isVerified: true,
      isFeatured: true,
      isTrending: true,
      metaTitle: "Kalinga Heights Khandagiri — Ready to Move 3 & 4 BHK",
      metaDescription:
        "Ready-to-move 3 & 4 BHK luxury flats at Kalinga Heights, Khandagiri, Bhubaneswar. Price from ₹75 Lakh.",
    },
  });

  await prisma.projectImage.createMany({
    data: [
      { projectId: project2.id, url: "https://placehold.co/800x500?text=Heights+Exterior", isCover: true,  sortOrder: 1 },
      { projectId: project2.id, url: "https://placehold.co/800x500?text=Heights+Interior", isCover: false, sortOrder: 2 },
    ],
  });

  await prisma.projectAmenity.createMany({
    data: amenities.slice(0, 6).map((a) => ({
      projectId: project2.id,
      amenityId: a.id,
    })),
  });

  await prisma.floorPlan.createMany({
    data: [
      {
        projectId:   project2.id,
        bhkType:     3,
        name:        "3 BHK Luxury",
        carpetArea:  1400,
        builtUpArea: 1700,
        superArea:   1950,
        price:       9000000n,
      },
      {
        projectId:   project2.id,
        bhkType:     4,
        name:        "4 BHK Penthouse",
        carpetArea:  2200,
        builtUpArea: 2600,
        superArea:   3000,
        price:       15000000n,
      },
    ],
  });

  console.log("✅ Project 2 (Kalinga Heights) created");

  // ============================================================
  // USER (test buyer)
  // ============================================================

  const user = await prisma.user.create({
    data: {
      phone: "+919876543210",
      email: "testbuyer@example.com",
      name: "Rahul Mohanty",
      role: "BUYER",
    },
  });

  console.log("✅ Test user created");

  // ============================================================
  // INDIVIDUAL PROPERTIES (resale / rent listings)
  // ============================================================

  const prop1 = await prisma.property.create({
    data: {
      title: "Spacious 3 BHK Flat for Sale in Patia",
      slug: "3bhk-flat-sale-patia-bhubaneswar-001",
      description:
        "Well-maintained 3 BHK apartment on the 7th floor with excellent cross ventilation, modular kitchen, and a large balcony overlooking the garden. Society has 24/7 security and power backup.",
      propertyType: "APARTMENT",
      listingType: "BUY",
      transactionType: "RESALE",
      cityId: city.id,
      localityId: patia.id,
      projectId: project1.id,
      address: "Tower B, Flat 703, Kalinga Greenfields, Patia",
      latitude: 20.3541,
      longitude: 85.8191,
      bhk: 3,
      bathrooms: 3,
      balconies: 2,
      carpetArea: 1250,
      builtUpArea: 1500,
      superArea: 1750,
      totalFloors: 12,
      floorNumber: 7,
      price: 8200000n,
      pricePerSqFt: 5467,
      isNegotiable: true,
      possessionStatus: "READY_TO_MOVE",
      furnishingStatus: "SEMI_FURNISHED",
      features: ["Modular Kitchen", "Vitrified Tiles", "False Ceiling", "Wardrobes"],
      facing: "East",
      overlooking: ["Garden", "Pool"],
      ownerId: user.id,
      isVerified: true,
      isFeatured: true,
      metaTitle: "3 BHK Flat for Sale in Patia Bhubaneswar — ₹82 Lakh",
      metaDescription:
        "Resale 3 BHK apartment in Kalinga Greenfields, Patia. 1750 sq ft, semi-furnished, east facing. Price ₹82 Lakh negotiable.",
    },
  });

  await prisma.propertyImage.createMany({
    data: [
      { propertyId: prop1.id, url: "https://placehold.co/800x500?text=Living+Room",  isCover: true,  sortOrder: 1 },
      { propertyId: prop1.id, url: "https://placehold.co/800x500?text=Master+Bedroom", isCover: false, sortOrder: 2 },
      { propertyId: prop1.id, url: "https://placehold.co/800x500?text=Kitchen",      isCover: false, sortOrder: 3 },
      { propertyId: prop1.id, url: "https://placehold.co/800x500?text=Balcony",      isCover: false, sortOrder: 4 },
    ],
  });

  const prop2 = await prisma.property.create({
    data: {
      title: "2 BHK Apartment for Rent in Patia",
      slug: "2bhk-apartment-rent-patia-bhubaneswar-001",
      description:
        "Fully furnished 2 BHK apartment available for rent in a gated society. Ideal for working professionals near KIIT and Infosys. Includes AC, washing machine, refrigerator, and WiFi.",
      propertyType: "APARTMENT",
      listingType: "RENT",
      transactionType: "RESALE",
      cityId: city.id,
      localityId: patia.id,
      address: "Tower A, Flat 504, Kalinga Greenfields, Patia",
      latitude: 20.3538,
      longitude: 85.8195,
      bhk: 2,
      bathrooms: 2,
      balconies: 1,
      carpetArea: 850,
      builtUpArea: 1050,
      superArea: 1200,
      totalFloors: 12,
      floorNumber: 5,
      price: 18000n,           // ₹18,000/month rent
      maintenanceCharge: 2000,
      securityDeposit: 54000,
      isNegotiable: false,
      possessionStatus: "READY_TO_MOVE",
      furnishingStatus: "FULLY_FURNISHED",
      availableFrom: new Date("2025-06-01"),
      features: ["AC in all rooms", "Washing Machine", "Refrigerator", "WiFi", "Modular Kitchen"],
      facing: "North",
      overlooking: ["Road"],
      ownerId: user.id,
      isVerified: true,
      metaTitle: "2 BHK Fully Furnished Flat for Rent in Patia Bhubaneswar — ₹18,000/mo",
      metaDescription:
        "Fully furnished 2 BHK flat for rent in Patia, Bhubaneswar near KIIT. ₹18,000/month. Available from June 2025.",
    },
  });

  await prisma.propertyImage.createMany({
    data: [
      { propertyId: prop2.id, url: "https://placehold.co/800x500?text=2BHK+Living+Room", isCover: true,  sortOrder: 1 },
      { propertyId: prop2.id, url: "https://placehold.co/800x500?text=2BHK+Bedroom",     isCover: false, sortOrder: 2 },
    ],
  });

  const prop3 = await prisma.property.create({
    data: {
      title: "3 BHK Villa for Sale in Khandagiri",
      slug: "3bhk-villa-sale-khandagiri-bhubaneswar-001",
      description:
        "Independent 3 BHK villa with private garden, car parking, and rooftop terrace. Quiet neighbourhood with easy access to Khandagiri metro station and schools.",
      propertyType: "VILLA",
      listingType: "BUY",
      transactionType: "RESALE",
      cityId: city.id,
      localityId: khandagiri.id,
      address: "Lane 4, Green Valley Villas, Khandagiri, Bhubaneswar",
      latitude: 20.2552,
      longitude: 85.7765,
      bhk: 3,
      bathrooms: 3,
      balconies: 2,
      carpetArea: 1800,
      builtUpArea: 2100,
      superArea: 2400,
      totalFloors: 2,
      floorNumber: 1,
      price: 12500000n,
      pricePerSqFt: 5208,
      isNegotiable: true,
      possessionStatus: "READY_TO_MOVE",
      furnishingStatus: "UNFURNISHED",
      features: ["Private Garden", "Rooftop Terrace", "Car Parking", "Rain Water Harvesting"],
      facing: "West",
      overlooking: ["Garden", "Hills"],
      ownerId: user.id,
      isVerified: true,
      isFeatured: false,
      metaTitle: "3 BHK Villa for Sale in Khandagiri Bhubaneswar — ₹1.25 Cr",
      metaDescription:
        "Independent 3 BHK villa for sale in Khandagiri, Bhubaneswar. 2400 sq ft with private garden. Price ₹1.25 Cr negotiable.",
    },
  });

  await prisma.propertyImage.createMany({
    data: [
      { propertyId: prop3.id, url: "https://placehold.co/800x500?text=Villa+Exterior", isCover: true,  sortOrder: 1 },
      { propertyId: prop3.id, url: "https://placehold.co/800x500?text=Villa+Garden",   isCover: false, sortOrder: 2 },
      { propertyId: prop3.id, url: "https://placehold.co/800x500?text=Villa+Terrace",  isCover: false, sortOrder: 3 },
    ],
  });

  console.log("✅ 3 properties created");

  // ============================================================
  // SAMPLE LEAD
  // ============================================================

  await prisma.lead.create({
    data: {
      buyerId: user.id,
      propertyId: prop1.id,
      message: "I am interested in this property. Please share more details and schedule a site visit.",
      budget: 9000000n,
      bhkPreference: [3],
      status: "NEW",
      source: "listing_page",
    },
  });

  console.log("✅ Sample lead created");

  // ============================================================
  // DONE
  // ============================================================

  console.log(`
╔══════════════════════════════════════════╗
║         Seed completed successfully      ║
╠══════════════════════════════════════════╣
║  Countries  : 1                          ║
║  States     : 1                          ║
║  Cities     : 1  (Bhubaneswar)           ║
║  Localities : 2  (Patia, Khandagiri)     ║
║  Amenities  : 8                          ║
║  Builders   : 1  (Kalinga Constructions) ║
║  Projects   : 2                          ║
║  Properties : 3  (2 buy, 1 rent)         ║
║  Users      : 1  (test buyer)            ║
║  Leads      : 1                          ║
╚══════════════════════════════════════════╝
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });