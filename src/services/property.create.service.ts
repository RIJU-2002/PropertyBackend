import prisma from "../lib/prisma";
import { CreatePropertyInput, UpdatePropertyInput } from "../validations/property.validation";
import cloudinary from "../config/cloudinary";

// ============================================================
// TYPES
// ============================================================

interface UploadedImage {
  url:       string;
  publicId:  string;
  isCover:   boolean;
  sortOrder: number;
}

// ============================================================
// SLUG GENERATION
// ============================================================

const generateSlug = (title: string, cityName: string): string => {
  const base = `${title}-${cityName}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
};

// ============================================================
// CLOUDINARY UPLOAD HELPER
// Uploads a single file buffer → returns Cloudinary URL + publicId
// ============================================================

const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,                      // e.g. "properties/bhubaneswar"
        resource_type: "image",
        transformation: [
          { width: 1280, height: 850, crop: "limit" }, // cap max size
          { quality: "auto:good" },                    // auto compress
          { fetch_format: "auto" },                    // serve webp/avif
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
        } else {
          resolve({
            url:      result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );
    stream.end(fileBuffer);
  });
};

// ============================================================
// UPLOAD ALL IMAGES
// Takes Express multer files → uploads all in parallel → returns image rows
// ============================================================

export const uploadPropertyImages = async (
  files: Express.Multer.File[],
  cityName: string
): Promise<UploadedImage[]> => {
  if (!files || files.length === 0) return [];

  const folder = `properties/${cityName.toLowerCase().replace(/\s+/g, "-")}`;

  // Upload all files in parallel
  const results = await Promise.all(
    files.map((file, index) =>
      uploadToCloudinary(file.buffer, folder).then(({ url, publicId }) => ({
        url,
        publicId,
        isCover:   index === 0,  // first image is the cover
        sortOrder: index + 1,
      }))
    )
  );

  return results;
};

// ============================================================
// DELETE IMAGE FROM CLOUDINARY
// ============================================================

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

// ============================================================
// ADD PROPERTY (with images)
// ============================================================

export const addProperty = async (
  data: CreatePropertyInput,
  ownerId: number,
  files: Express.Multer.File[]   // from multer — can be empty array
) => {
  // ── Validate city ─────────────────────────────────────────
  const city = await prisma.city.findUnique({
    where:  { id: data.cityId },
    select: { name: true },
  });

  if (!city) throw new Error("CITY_NOT_FOUND");

  // ── Validate locality belongs to city ─────────────────────
  const locality = await prisma.locality.findFirst({
    where: { id: data.localityId, cityId: data.cityId },
  });

  if (!locality) throw new Error("LOCALITY_NOT_FOUND");

  // ── Generate unique slug ──────────────────────────────────
  let slug = generateSlug(data.title, city.name);
  const existing = await prisma.property.findUnique({ where: { slug } });
  if (existing) slug = generateSlug(data.title, city.name);

  // ── Upload images to Cloudinary ───────────────────────────
  // Done BEFORE creating the DB record so if upload fails,
  // no orphan property is left in the database
  const uploadedImages = await uploadPropertyImages(files, city.name);

  // ── Create property + images in one transaction ───────────
  const property = await prisma.property.create({
    data: {
      title:             data.title,
      slug,
      description:       data.description,
      propertyType:      data.propertyType,
      listingType:       data.listingType,
      transactionType:   data.transactionType  ?? "RESALE",
      cityId:            data.cityId,
      localityId:        data.localityId,
      projectId:         data.projectId,
      address:           data.address,
      latitude:          data.latitude,
      longitude:         data.longitude,
      bhk:               data.bhk,
      bathrooms:         data.bathrooms,
      balconies:         data.balconies,
      carpetArea:        data.carpetArea,
      builtUpArea:       data.builtUpArea,
      superArea:         data.superArea,
      totalFloors:       data.totalFloors,
      floorNumber:       data.floorNumber,
      price:             BigInt(data.price),
      pricePerSqFt:      data.pricePerSqFt,
      isNegotiable:      data.isNegotiable     ?? false,
      maintenanceCharge: data.maintenanceCharge,
      securityDeposit:   data.securityDeposit,
      possessionStatus:  data.possessionStatus ?? "READY_TO_MOVE",
      furnishingStatus:  data.furnishingStatus ?? "UNFURNISHED",
      availableFrom:     data.availableFrom ? new Date(data.availableFrom) : undefined,
      features:          data.features         ?? [],
      overlooking:       data.overlooking      ?? [],
      facing:            data.facing,
      ownerId,
      isVerified:        false,
      isActive:          true,

      // ── Nested create for images ──────────────────────────
      images: {
        create: uploadedImages.map((img) => ({
          url:       img.url,
          isCover:   img.isCover,
          sortOrder: img.sortOrder,
        })),
      },
    },
    include: {
      city:     { select: { name: true, slug: true } },
      locality: { select: { name: true, slug: true } },
      images:   { orderBy: { sortOrder: "asc" } },
    },
  });

  
  return property;
};

// ============================================================
// ADD IMAGES TO EXISTING PROPERTY
// Separate endpoint for adding more photos after creation
// ============================================================

export const addImagesToProperty = async (
  propertyId: number,
  requesterId: number,
  requesterRole: string,
  files: Express.Multer.File[]
) => {
  // select only — never mix select + include in same query
  const property = await prisma.property.findUnique({
    where:  { id: propertyId },
    select: {
      ownerId: true,
      cityId:  true,
      images:  { select: { id: true } },  // just need count
      city:    { select: { name: true } }, // moved from include → nested select
    },
  });

  if (!property) throw new Error("PROPERTY_NOT_FOUND");

  if (property.ownerId !== requesterId && requesterRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const currentCount = property.images?.length ?? 0;

  const uploadedImages = await uploadPropertyImages(files, property.city?.name ?? "general");

  await prisma.propertyImage.createMany({
    data: uploadedImages.map((img, index) => ({
      propertyId,
      url:       img.url,
      isCover:   currentCount === 0 && index === 0, // cover only if no images exist yet
      sortOrder: currentCount + index + 1,
    })),
  });

  return prisma.property.findUnique({
    where:   { id: propertyId },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
};

// ============================================================
// DELETE SINGLE IMAGE
// ============================================================

export const deletePropertyImage = async (
  imageId: number,
  requesterId: number,
  requesterRole: string
) => {
  const image = await prisma.propertyImage.findUnique({
    where:   { id: imageId },
    include: { property: { select: { ownerId: true } } },
  });

  if (!image) throw new Error("IMAGE_NOT_FOUND");

  if (image.property.ownerId !== requesterId && requesterRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  // Delete from Cloudinary first — if this fails, DB record stays (safe)
  // Cloudinary public_id is not stored in current schema — add it if needed
  // await deleteFromCloudinary(image.publicId);

  await prisma.propertyImage.delete({ where: { id: imageId } });
};

// ============================================================
// EDIT PROPERTY
// ============================================================

export const editProperty = async (
  id: number,
  data: UpdatePropertyInput,
  requesterId: number,
  requesterRole: string
) => {
  const existing = await prisma.property.findUnique({
    where:  { id },
    select: { ownerId: true, isActive: true },
  });

  if (!existing)        throw new Error("PROPERTY_NOT_FOUND");
  if (!existing.isActive) throw new Error("PROPERTY_NOT_ACTIVE");

  if (existing.ownerId !== requesterId && requesterRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return prisma.property.update({
    where: { id },
    data: {
      ...(data.title             && { title:             data.title            }),
      ...(data.description       && { description:       data.description      }),
      ...(data.cityId            && { cityId:            data.cityId           }),
      ...(data.localityId        && { localityId:        data.localityId       }),
      ...(data.address           && { address:           data.address          }),
      ...(data.latitude          && { latitude:          data.latitude         }),
      ...(data.longitude         && { longitude:         data.longitude        }),
      ...(data.bhk               && { bhk:               data.bhk              }),
      ...(data.bathrooms         && { bathrooms:         data.bathrooms        }),
      ...(data.balconies         !== undefined && { balconies:  data.balconies  }),
      ...(data.carpetArea        && { carpetArea:        data.carpetArea       }),
      ...(data.builtUpArea       && { builtUpArea:       data.builtUpArea      }),
      ...(data.superArea         && { superArea:         data.superArea        }),
      ...(data.totalFloors       && { totalFloors:       data.totalFloors      }),
      ...(data.floorNumber       !== undefined && { floorNumber: data.floorNumber }),
      ...(data.price             && { price:             BigInt(data.price)    }),
      ...(data.pricePerSqFt      && { pricePerSqFt:      data.pricePerSqFt     }),
      ...(data.isNegotiable      !== undefined && { isNegotiable: data.isNegotiable }),
      ...(data.possessionStatus  && { possessionStatus:  data.possessionStatus }),
      ...(data.furnishingStatus  && { furnishingStatus:  data.furnishingStatus }),
      ...(data.features          && { features:          data.features         }),
      ...(data.overlooking       && { overlooking:       data.overlooking      }),
      ...(data.facing            && { facing:            data.facing           }),
      ...(data.isActive          !== undefined && { isActive: data.isActive    }),
    },
  });
};

// ============================================================
// REMOVE PROPERTY (soft delete)
// ============================================================

export const removeProperty = async (
  id: number,
  requesterId: number,
  requesterRole: string
) => {
  const existing = await prisma.property.findUnique({
    where:  { id },
    select: { ownerId: true },
  });

  if (!existing) throw new Error("PROPERTY_NOT_FOUND");

  if (existing.ownerId !== requesterId && requesterRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return prisma.property.update({
    where: { id },
    data:  { isActive: false },
  });
};