import prisma from "../lib/prisma";
import cloudinary from "../config/cloudinary";
import { CreateProjectInput, UpdateProjectInput,AddProjectConfigsInput } from "../validations/project.validation";


import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
// ============================================================
// SLUG GENERATION
// ============================================================

const generateSlug = (name: string, cityName: string): string => {
  const base = `${name}-${cityName}`
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
// FIND OR CREATE CITY
// ============================================================

export const findOrCreateCity = async (
  tx: Tx,
  cityName: string,
  stateId: number
) => {
  const name = cityName.trim();

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return tx.city.upsert({
    where: {
      slug_stateId: {
        slug,
        stateId,
      },
    },
    update: {},
    create: {
      name,
      slug,
      stateId,
    },
  });
};

// ============================================================
// FIND OR CREATE LOCALITY
// ============================================================

export const findOrCreateLocality = async (
  tx: Tx,
  localityName: string,
  cityId: number
) => {
  const name = localityName.trim();

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return tx.locality.upsert({
    where: {
      slug_cityId: {
        slug,
        cityId,
      },
    },
    update: {},
    create: {
      name,
      slug,
      cityId,
    },
  });
};

// ============================================================
// FIND OR CREATE BHILDER
// ============================================================
export const findOrCreateBuilder = async (
  tx: Tx,
  builderName: string
) => {
  const name = builderName.trim();

  const slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  return tx.builder.upsert({
    where: {
      name,
    },
    update: {},
    create: {
      name,
      slug,
      isVerified: false,
      totalProjects: 0,
    },
  });
};


// ============================================================
// CLOUDINARY UPLOAD HELPER
// ============================================================

const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder:     string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 1280, height: 850, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    );
    stream.end(fileBuffer);
  });
};

// ============================================================
// ADD PROJECT
// ============================================================

export const addProject = async (
  data:  CreateProjectInput,
  files: Express.Multer.File[]
) => {
  
  let uploadCityName = data.cityName ?? "";

  if (data.cityId) {
    const city = await prisma.city.findUnique({
      where: { id: data.cityId },
      select: { name: true },
    });

    if (!city) {
      throw new Error("CITY_NOT_FOUND");
    }

    uploadCityName = city.name;
  }

  // ── Step 4: Upload images to Cloudinary ──────────────────
  const folder        = `projects/${uploadCityName.toLowerCase().replace(/\s+/g, "-")}`;
  const uploadedImages = await Promise.all(
    files.map((file, index) =>
      uploadToCloudinary(file.buffer, folder).then(({ url }) => ({
        url,
        isCover:   index === 0,
        sortOrder: index + 1,
      }))
    )
  );

  const project = await prisma.$transaction(
    async (tx) => {

      let cityId: number;
      let localityId: number;
      let cityName: string;
      let builderId: number;

      if (data.cityId && data.localityId) {

        const city = await tx.city.findUnique({
          where: { id: data.cityId },
          select: {
            id: true,
            name: true,
          },
        });

        if (!city) {
          throw new Error("CITY_NOT_FOUND");
        }

        const locality = await tx.locality.findFirst({
          where: {
            id: data.localityId,
            cityId: city.id,
          },
        });

        if (!locality) {
          throw new Error("LOCALITY_NOT_FOUND");
        }

        cityId = city.id;
        cityName = city.name;
        localityId = locality.id;

      } else {

        const city = await findOrCreateCity(
          tx,
          data.cityName!,
          data.stateId!
        );

        const locality =
          await findOrCreateLocality(
            tx,
            data.localityName!,
            city.id
          );

        cityId = city.id;
        cityName = city.name;
        localityId = locality.id;
      }

      if (data.builderId) {

        const builder =
          await tx.builder.findUnique({
            where: {
              id: data.builderId,
            },
          });

        if (!builder) {
          throw new Error("BUILDER_NOT_FOUND");
        }

        builderId = builder.id;

      } else {

        const builder =
          await findOrCreateBuilder(
            tx,
            data.builderName!
          );

        builderId = builder.id;
      }

      let slug = generateSlug(
        data.name,
        cityName
      );

      const existingProject =
        await tx.project.findUnique({
          where: { slug },
        });

      if (existingProject) {
        slug = generateSlug(
          data.name,
          cityName
        );
      }

      // create project

    // ── Step 5: Create project with all relations ─────────────
      const project = await tx.project.create({
        data: {
          name:             data.name,
          slug,
          builderId,
          configs: {
            create: data.configs.map((config) => ({
              unitType: config.unitType,
              buildAreaRange: config.buildAreaRange,
              carpetArea: config.carpetArea,
              bedRoom: config.bedRoom,
              livingArea: config.livingArea,
              kitchen: config.kitchen,
              balconies: config.balconies,
              floorHeight: config.floorHeight,
              flooring: config.flooring,
              facing: config.facing,
              pricePerArea: config.pricePerArea,
              price: config.price
                ? BigInt(
                    String(config.price).replace(/[₹,]/g, "")
                  )
                : null,
              units: config.units
                ? Number(config.units)
                : null,
            })),
          },
          cityId,
          localityId,
          address:          data.address,
          latitude:         data.latitude,
          longitude:        data.longitude,
          description:      data.description,
          minPrice:         data.minPrice ? BigInt(data.minPrice) : undefined,
          maxPrice:         data.maxPrice ? BigInt(data.maxPrice) : undefined,
          possessionStatus: data.possessionStatus ?? "UNDER_CONSTRUCTION",
          launchDate:       data.launchDate     ? new Date(data.launchDate)     : undefined,
          possessionDate:   data.possessionDate ? new Date(data.possessionDate) : undefined,
          reraNumber:       data.reraNumber,
          totalUnits:       data.totalUnits,
          totalTowers:      data.totalTowers,
          totalFloors:      data.totalFloors,
          landArea:         data.landArea,
          isFeatured:       data.isFeatured  ?? false,
          isTrending:       data.isTrending  ?? false,
          isNewLaunch:      data.isNewLaunch ?? false,
          metaTitle:        data.metaTitle,
          metaDescription:  data.metaDescription,
          isVerified:       false,  // always false on creation — admin verifies

          // ── Nested creates ──────────────────────────────────
          images: {
            create: uploadedImages,
          },

          amenities: data.amenityIds.length > 0 ? {
            create: data.amenityIds.map((amenityId) => ({ amenityId })),
          } : undefined,

          floorPlans: data.floorPlans.length > 0 ? {
            create: data.floorPlans.map((fp) => ({
              bhkType:     fp.bhkType,
              name:        fp.name,
              carpetArea:  fp.carpetArea,
              builtUpArea: fp.builtUpArea,
              superArea:   fp.superArea,
              price:       fp.price ? BigInt(fp.price) : undefined,
            })),
          } : undefined,
        },
        include: {
          builder:    { select: { name: true, slug: true } },
          city:       { select: { name: true, slug: true } },
          locality:   { select: { name: true, slug: true } },
          images:     { orderBy: { sortOrder: "asc" } },
          floorPlans: { orderBy: { bhkType: "asc" } },
          amenities:  { include: { amenity: true } },
        },
      });

    // ── Step 6: Update builder's totalProjects count ──────────
    await tx.builder.update({
      where: { id: builderId },
      data:  { totalProjects: { increment: 1 } },
    });
    return project;
    }
  );
  return project;
};

// ============================================================
// EDIT PROJECT
// ============================================================

export const editProject = async (
  id:             number,
  data:           UpdateProjectInput,
  requesterRole:  string
) => {
  // Only admin can edit projects
  if (requesterRole !== "ADMIN") throw new Error("FORBIDDEN");

  const existing = await prisma.project.findUnique({
    where:  { id },
    select: { id: true },
  });
  if (!existing) throw new Error("PROJECT_NOT_FOUND");

  let builderId: number | undefined;

  if (data.builderId) {
    const builder = await prisma.builder.findUnique({
      where: {
        id: data.builderId,
      },
    });

    if (!builder) {
      throw new Error("BUILDER_NOT_FOUND");
    }

    builderId = builder.id;
  } else if (data.builderName) {
    const builder = await findOrCreateBuilder(
      prisma,
      data.builderName
    );

    builderId = builder.id;
  }

  return prisma.project.update({
    where: { id },
    data: {
      ...(builderId !== undefined && {
        builderId,
      }),

      ...(data.name !== undefined && {
        name: data.name,
      }),

      ...(data.description !== undefined && {
        description: data.description,
      }),

      ...(data.address !== undefined && {
        address: data.address,
      }),

      ...(data.latitude !== undefined && {
        latitude: data.latitude,
      }),

      ...(data.longitude !== undefined && {
        longitude: data.longitude,
      }),

      ...(data.minPrice !== undefined && {
        minPrice: BigInt(data.minPrice),
      }),

      ...(data.maxPrice !== undefined && {
        maxPrice: BigInt(data.maxPrice),
      }),

      ...(data.possessionStatus !== undefined && {
        possessionStatus: data.possessionStatus,
      }),

      ...(data.reraNumber !== undefined && {
        reraNumber: data.reraNumber,
      }),

      ...(data.totalUnits !== undefined && {
        totalUnits: data.totalUnits,
      }),

      ...(data.totalTowers !== undefined && {
        totalTowers: data.totalTowers,
      }),

      ...(data.totalFloors !== undefined && {
        totalFloors: data.totalFloors,
      }),

      ...(data.landArea !== undefined && {
        landArea: data.landArea,
      }),

      ...(data.isFeatured !== undefined && {
        isFeatured: data.isFeatured,
      }),

      ...(data.isActive !== undefined && {
        isActive: data.isActive,
      }),

      ...(data.isTrending !== undefined && {
        isTrending: data.isTrending,
      }),

      ...(data.isNewLaunch !== undefined && {
        isNewLaunch: data.isNewLaunch,
      }),

      ...(data.isVerified !== undefined && {
        isVerified: data.isVerified,
      }),

      ...(data.metaTitle !== undefined && {
        metaTitle: data.metaTitle,
      }),

      ...(data.metaDescription !== undefined && {
        metaDescription: data.metaDescription,
      }),

      ...(data.launchDate !== undefined && {
        launchDate: new Date(data.launchDate),
      }),

      ...(data.possessionDate !== undefined && {
        possessionDate: new Date(data.possessionDate),
      }),
    },
  });
};
// ============================================================
// ADD IMAGES TO PROJECT
// ============================================================

export const addProjectImages = async (
  projectId:     number,
  requesterRole: string,
  files:         Express.Multer.File[]
) => {
  if (requesterRole !== "ADMIN") throw new Error("FORBIDDEN");

  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: {
      id:     true,
      images: { select: { id: true } },
      city:   { select: { name: true } },
    },
  });

  if (!project) throw new Error("PROJECT_NOT_FOUND");

  const folder        = `projects/${project.city.name.toLowerCase().replace(/\s+/g, "-")}`;
  const currentCount  = project.images.length;

  const uploadedImages = await Promise.all(
    files.map((file, index) =>
      uploadToCloudinary(file.buffer, folder).then(({ url }) => ({
        projectId,
        url,
        isCover:   currentCount === 0 && index === 0,
        sortOrder: currentCount + index + 1,
      }))
    )
  );

  await prisma.projectImage.createMany({ data: uploadedImages });

  return prisma.project.findUnique({
    where:   { id: projectId },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
};

// ============================================================
// DELETE PROJECT (soft — mark inactive via isVerified=false)
// Since schema has no isActive on Project, we use a different
// approach — remove from featured and mark unverified
// ============================================================

export const removeProject = async (
  id: number,
  requesterRole: string
) => {
  if (requesterRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const existing = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      builderId: true,
      isActive: true,
    },
  });

  if (!existing) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  // Already deleted
  if (!existing.isActive) {
    throw new Error("PROJECT_ALREADY_DELETED");
  }

  // Decrement builder count
 return prisma.$transaction(async (tx) => {
  await tx.builder.update({
    where: { id: existing.builderId },
    data: {
      totalProjects: {
        decrement: 1,
      },
    },
  });

  return tx.project.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
});
};

 
export const addProjectConfigs = async (
  projectId: number,
  configs: AddProjectConfigsInput["configs"],
  requesterRole: string
) => {
  if (requesterRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    await tx.projectConfig.deleteMany({
      where: {
        projectId,
      },
    });

    await tx.projectConfig.createMany({
      data: configs.map((config) => ({
        projectId,

        unitType: config.unitType,

        buildAreaRange: config.buildAreaRange,
        carpetArea: config.carpetArea,

        bedRoom: config.bedRoom,
        livingArea: config.livingArea,
        kitchen: config.kitchen,

        balconies: config.balconies,
        floorHeight: config.floorHeight,
        flooring: config.flooring,

        facing: config.facing,

        pricePerArea: config.pricePerArea,

        price: config.price
          ? BigInt(config.price)
          : null,

        units: config.units ?? null,
      })),
    });

    return tx.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        configs: true,
      },
    });
  });
};