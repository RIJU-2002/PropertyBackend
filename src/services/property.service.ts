import prisma from "../lib/prisma"; // ← your shared instance

import { Prisma } from "@prisma/client";
 
// ============================================================
// TYPES
// ============================================================
 
interface PropertyQuery {
  page?: string;
  limit?: string;
  city?: string;
  locality?: string;
  bhk?: string;           // single OR comma-separated: "3" or "2,3,4"
  listingType?: string;
  propertyType?: string;
  furnishingStatus?: string;
  possessionStatus?: string;
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
  sort?: "price_asc" | "price_desc" | "latest" | "popular";
}
 
// ============================================================
// FETCH PROPERTIES
// ============================================================
 
export const fetchProperties = async (query: PropertyQuery) => {
  const {
    page = "1",
    limit = "10",
    city,
    locality,
    bhk,
    listingType,
    propertyType,
    furnishingStatus,
    possessionStatus,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    sort,
  } = query;
 
  // ============================================================
  // PAGINATION
  // ============================================================
 
  const currentPage = Math.max(1, Number(page));
  const take        = Math.min(50, Math.max(1, Number(limit)));
  const skip        = (currentPage - 1) * take;
 
  // ============================================================
  // SORTING
  // ============================================================
 
  let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: "desc" };
 
  if (sort === "price_asc")  orderBy = { price: "asc"      };
  if (sort === "price_desc") orderBy = { price: "desc"     };
  if (sort === "latest")     orderBy = { createdAt: "desc" };
  if (sort === "popular")    orderBy = { viewCount: "desc" };
 
  // ============================================================
  // FILTERS
  // ============================================================
 
  const where: Prisma.PropertyWhereInput = { isActive: true };
 
  if (city)     where.city     = { slug: city };
  if (locality) where.locality = { slug: locality };
 
  // ---- BHK — handles both "3" and "2,3,4" on the same ?bhk= param ----
  if (bhk) {
    const bhkList = bhk
      .split(",")                           // split on comma
      .map((v) => Number(v.trim()))         // trim spaces + convert to number
      .filter((v) => !isNaN(v) && v > 0);  // drop anything invalid like NaN
 
    if (bhkList.length === 1) {
      where.bhk = bhkList[0];         // ?bhk=3      → exact match
    } else if (bhkList.length > 1) {
      where.bhk = { in: bhkList };    // ?bhk=2,3,4  → IN query
    }
  }
 
  if (listingType)      where.listingType      = listingType      as any;
  if (propertyType)     where.propertyType     = propertyType     as any;
  if (furnishingStatus) where.furnishingStatus = furnishingStatus as any;
  if (possessionStatus) where.possessionStatus = possessionStatus as any;
 
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) (where.price as any).gte = BigInt(minPrice);
    if (maxPrice) (where.price as any).lte = BigInt(maxPrice);
  }
 
  if (minArea || maxArea) {
    where.superArea = {};
    if (minArea) (where.superArea as any).gte = Number(minArea);
    if (maxArea) (where.superArea as any).lte = Number(maxArea);
  }
 
  // ============================================================
  // QUERY
  // ============================================================
 
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        city:     true,
        locality: true,
        images: {
          where:   { isCover: true },
          take:    1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.property.count({ where }),
  ]);
 
  return {
    properties,
    pagination: {
      total,
      page:       currentPage,
      limit:      take,
      totalPages: Math.ceil(total / take),
      hasNext:    currentPage < Math.ceil(total / take),
      hasPrev:    currentPage > 1,
    },
  };
};



// export const fetchPropertyBySlug = async (
//   slug: string
// ) => {
//   return prisma.property.findUnique({
//     where: {
//       slug,
//     },

//     include: {
//       city: true,
//       locality: true,
//       project: {
//         include: {
//           builder: true,
//           amenities: {
//             include: {
//               amenity: true,
//             },
//           },
//           nearbyPlaces: true,
//         },
//       },

//       images: {
//         orderBy: {
//           sortOrder: "asc",
//         },
//       },

//       owner: true,
//     },
//   });
// };



// export const addProperty = async (data: any) => {
//   return prisma.property.create({
//     data: {
//       title: data.title,
//       slug: data.slug,
//       description: data.description,

//       propertyType: data.propertyType,
//       listingType: data.listingType,
//       transactionType: data.transactionType,

//       cityId: Number(data.cityId),
//       localityId: Number(data.localityId),

//       address: data.address,

//       bhk: Number(data.bhk),
//       bathrooms: Number(data.bathrooms),
//       balconies: Number(data.balconies),

//       carpetArea: Number(data.carpetArea),
//       builtUpArea: Number(data.builtUpArea),

//       price: BigInt(data.price),

//       furnishingStatus: data.furnishingStatus,

//       features: data.features || [],
//       overlooking: data.overlooking || [],

//       ownerId: Number(data.ownerId),

//       isVerified: false,
//       isActive: true,
//     },
//   });
// };



// export const editProperty = async (
//   id: number,
//   data: any
// ) => {
//   return prisma.property.update({
//     where: {
//       id,
//     },

//     data: {
//       ...data,

//       cityId: data.cityId
//         ? Number(data.cityId)
//         : undefined,

//       localityId: data.localityId
//         ? Number(data.localityId)
//         : undefined,

//       bhk: data.bhk
//         ? Number(data.bhk)
//         : undefined,

//       bathrooms: data.bathrooms
//         ? Number(data.bathrooms)
//         : undefined,

//       balconies: data.balconies
//         ? Number(data.balconies)
//         : undefined,

//       carpetArea: data.carpetArea
//         ? Number(data.carpetArea)
//         : undefined,

//       builtUpArea: data.builtUpArea
//         ? Number(data.builtUpArea)
//         : undefined,

//       price: data.price
//         ? BigInt(data.price)
//         : undefined,

//       ownerId: data.ownerId
//         ? Number(data.ownerId)
//         : undefined,
//     },
//   });
// };


// export const removeProperty = async (
//   id: number
// ) => {
//   return prisma.property.update({
//     where: {
//       id,
//     },

//     data: {
//       isActive: false,
//     },
//   });
// };

// ============================================================
// CREATE PROPERTY FROM PROJECT
// ============================================================

import { CreatePropertyFromProjectInput } from "../validations/property.validation";

export const createPropertyFromProject = async (
  projectId: number,
  data: CreatePropertyFromProjectInput
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      builderId: true,
      cityId: true,
      localityId: true,
      address: true,
      latitude: true,
      longitude: true,
      possessionStatus: true,
    },
  });

  if (!project) throw new Error("PROJECT_NOT_FOUND");

  const builder = await prisma.builder.findUnique({
    where: { id: project.builderId },
  });

  if (!builder) throw new Error("BUILDER_NOT_FOUND");

  const title =
    data.title ||
    `${data.bhk}BHK ${data.propertyType} in ${project.name}`;

  const price = Math.round(data.superArea * data.pricePerSqFt);
  console.log("ownerId:", data.ownerId);

  return prisma.property.create({
    data: {
      title,
      slug: `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      description: data.description,
      propertyType: data.propertyType,
      listingType: "BUY",
      transactionType: "NEW_PROPERTY",
      cityId: project.cityId,
      localityId: project.localityId,
      projectId,
      address: project.address,
      latitude: project.latitude,
      longitude: project.longitude,
      bhk: data.bhk,
      balconies: data.balconies,
      carpetArea: data.carpetArea,
      builtUpArea: data.superArea,
      superArea: data.superArea,
      floorNumber: data.floorNumber,
      price: BigInt(price),
      pricePerSqFt: data.pricePerSqFt,
      possessionStatus: project.possessionStatus,
      furnishingStatus: "UNFURNISHED",
      features: data.features,
      facing: data.facing,
      ownerId: data.ownerId,
      builderId: project.builderId,
    },
    include: {
      project: { select: { name: true, slug: true } },
    },
  });
};