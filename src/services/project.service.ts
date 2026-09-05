import prisma from "../lib/prisma";
import { Prisma ,PropertyType} from "@prisma/client";
import { cacheRemember, cacheKeyFromQuery } from "../utils/cache";
// ============================================================
// TYPES
// ============================================================

interface ProjectQuery {
  page?:             string;
  limit?:            string;
  city?:             string;
  locality?:         string;
  builderId?:        string;
  possessionStatus?: string;
  propertyType?:    string;
  minPrice?:         string;
  maxPrice?:         string;
  minArea?:          string;
  maxArea?:          string;
  bhk?:              string;   // filter by available BHK types in floor plans
  isFeatured?:       string;
  isTrending?:       string;
  isNewLaunch?:      string;
  sort?:             string;
}

// ============================================================
// FETCH PROJECTS (search + filter + paginate)
// ============================================================

export const fetchProjects = async (query: ProjectQuery) => {
  const {
    page    = "1",
    limit   = "10",
    city,
    locality,
    builderId,
    possessionStatus,
    propertyType,        // ← changed from propertyType
    bhk,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    isFeatured,
    isTrending,
    isNewLaunch,
    sort,
  } = query;

  const currentPage = Math.max(1, Number(page));
  const take        = Math.min(50, Math.max(1, Number(limit)));
  const skip        = (currentPage - 1) * take;

  // ── Sorting ───────────────────────────────────────────────
  let orderBy: Prisma.ProjectOrderByWithRelationInput = { createdAt: "desc" };

  if (sort === "price_asc")  orderBy = { minPrice: "asc"   };
  if (sort === "price_desc") orderBy = { minPrice: "desc"  };
  if (sort === "latest")     orderBy = { createdAt: "desc"  };
  if (sort === "popular")    orderBy = { leads: { _count: "desc" } };

  // ── Filters ───────────────────────────────────────────────
  const where: Prisma.ProjectWhereInput = {};

  if (city)             where.city             = { slug: city };
  if (locality)         where.locality         = { slug: locality };
  if (builderId)        where.builderId        = Number(builderId);
  if (possessionStatus) where.possessionStatus = possessionStatus as any;

  // ← fixed: projectType instead of propertyType
  if (propertyType) {
    where.projectType = propertyType as PropertyType;
  }

  if (isFeatured  === "true") where.isFeatured  = true;
  if (isTrending  === "true") where.isTrending  = true;
  if (isNewLaunch === "true") where.isNewLaunch = true;

  // ── Merge configs filters (don't overwrite) ─────────────────
  const configFilters: Prisma.ProjectConfigListRelationFilter = { some: {} };

  if (minPrice || maxPrice) {
    configFilters.some!.price = {
      ...(minPrice && { gte: BigInt(minPrice) }),
      ...(maxPrice && { lte: BigInt(maxPrice) }),
    };
  }

  if (bhk) {
    configFilters.some!.unitType = { startsWith: bhk };
  }

  // Only attach configs filter if we actually built one
  if (Object.keys(configFilters.some!).length > 0) {
    where.configs = configFilters;
  }

  const minAreaNum = minArea ? Number(minArea) : NaN;
  const maxAreaNum = maxArea ? Number(maxArea) : NaN;
  if (Number.isFinite(minAreaNum) || Number.isFinite(maxAreaNum)) {
    const areaBounds: Prisma.FloatNullableFilter = {
      ...(Number.isFinite(minAreaNum) ? { gte: minAreaNum } : {}),
      ...(Number.isFinite(maxAreaNum) ? { lte: maxAreaNum } : {}),
    };
    where.floorPlans = {
      some: {
        OR: [
          { carpetArea: areaBounds },
          { builtUpArea: areaBounds },
          { superArea: areaBounds },
        ],
      },
    };
  }

  // ── Query ─────────────────────────────────────────────────
  const cacheKey = cacheKeyFromQuery("projects:list", query as Record<string, unknown>);

  return cacheRemember(cacheKey, 60, async () => {
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        builder:  { select: { name: true, slug: true, logoUrl: true, isVerified: true } },
        city:     { select: { name: true, slug: true } },
        locality: { select: { name: true, slug: true } },
        images: {
          where:   { isCover: true },
          take:    1,
          orderBy: { sortOrder: "asc" },
        },
        floorPlans: {
          orderBy: { bhkType: "asc" },
          select: {
            id: true,
            bhkType: true,
            name: true,
            carpetArea: true,
            builtUpArea: true,
            superArea: true,
            price: true,
            imageUrl: true,
          },
        },
        amenities: { include: { amenity: true } },
        configs: {
          select: {
            unitType: true,
            buildAreaRange: true,
            carpetArea: true,
            bastu_Info: true,
            price: true,
            units: true,
          },
          orderBy: { price: "asc" },
        },
        _count: { select: { properties: true, leads: true } },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects,
    pagination: {
      total,
      page:       currentPage,
      limit:      take,
      totalPages: Math.ceil(total / take),
      hasNext:    currentPage < Math.ceil(total / take),
      hasPrev:    currentPage > 1,
    },
  };
  });
};

// ============================================================
// FETCH SINGLE PROJECT BY SLUG
// Full detail page data
// ============================================================

export const fetchProjectBySlug = async (slug: string) => {
  return cacheRemember(`project:slug:${slug}`, 180, () =>
  prisma.project.findUnique({
    where: { slug },
    include: {
      builder:  true,
      city:     { select: { name: true, slug: true } },
      locality: { select: { name: true, slug: true } },
      images:   { orderBy: { sortOrder: "asc" } },
      configs:  { orderBy: {unitType: "asc"}},
      floorPlans: { orderBy: { bhkType: "asc" } },
      amenities:  { include: { amenity: true } },
      nearbyPlaces: { orderBy: { distanceKm: "asc" } },
      reviews: {
        where:   { isVerified: true },
        include: { user: { select: { name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take:    10,
      },
      _count: { select: { properties: true, leads: true } },
    },
  })
  );
};

// ============================================================
// FETCH FEATURED PROJECTS (homepage)
// ============================================================

export const fetchFeaturedProjects = async (citySlug?: string) => {
  const cacheKey = `featured:projects:${citySlug ?? "all"}`;

  return cacheRemember(cacheKey, 600, async () => {
    return prisma.project.findMany({
      where: {
        isFeatured: true,
        ...(citySlug
          ? {
              city: {
                slug: citySlug,
              },
            }
          : {}),
      },

      include: {
        builder: {
          select: {
            name: true,
            slug: true,
            isVerified: true,
          },
        },

        city: {
          select: {
            name: true,
            slug: true,
          },
        },

        locality: {
          select: {
            name: true,
            slug: true,
          },
        },

        images: {
          where: {
            isCover: true,
          },
          take: 1,
          orderBy: {
            sortOrder: "asc",
          },
        },
        amenities:  { include: { amenity: true } },
        configs: {
          select: {
            unitType: true,
            buildAreaRange: true,
            carpetArea: true,
            bastu_Info: true,
            price: true,
            units: true,
          },
          orderBy: {
            price: "asc",
          },
        },

        floorPlans: {
          select: {
            bhkType: true,
            price: true,
          },
          orderBy: {
            bhkType: "asc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 6,
    });
  });
};

// ============================================================
// FETCH PROJECTS BY BUILDER
// Builder profile page
// ============================================================

export const fetchProjectsByBuilder = async (
  builderSlug: string,
  page:  number = 1,
  limit: number = 10
) => {
  return cacheRemember(
    `projects:builder:${builderSlug}:${page}:${limit}`,
    120,
    async () => {
  const builder = await prisma.builder.findUnique({
    where:  { slug: builderSlug },
    select: {
      id:              true,
      name:            true,
      slug:            true,
      logoUrl:         true,
      description:     true,
      establishedYear: true,
      totalProjects:   true,
      overallRating:   true,
      ratingCount:     true,
      isVerified:      true,
    },
  });

  if (!builder) throw new Error("BUILDER_NOT_FOUND");

  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where:   { builderId: builder.id },
      include: {
        city:     { select: { name: true, slug: true } },
        locality: { select: { name: true, slug: true } },
        images: {
          where:   { isCover: true },
          take:    1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count({ where: { builderId: builder.id } }),
  ]);

  return {
    builder,
    projects,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
    }
  );
};


export const fetchProjectById = async (id: number) => {
  return cacheRemember(`project:id:${id}`, 60, () =>
  prisma.project.findUnique({
    where: { id },
    include: {
      builder: true,

      city: {
        include: {
          state: true,
        },
      },

      locality: true,

      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      configs: {
        orderBy: {
          unitType: "asc",
        },
      },

      amenities: {
        include: {
          amenity: true,
        },
      },

      nearbyPlaces: true,

      floorPlans: true,
    },
  })
  );
};


export async function getFilterCounts() {
  return cacheRemember("projects:filter-counts", 300, async () => {
  const [
    projectTypes,
    possessionStatuses,
    newLaunchCount,
    bhkCounts,
  ] = await Promise.all([
    prisma.project.groupBy({
      by: ["projectType"],
      where: {
        isActive: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.project.groupBy({
      by: ["possessionStatus"],
      where: {
        isActive: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.project.count({
      where: {
        isActive: true,
        isNewLaunch: true,
      },
    }),

    prisma.projectConfig.groupBy({
      by: ["bedRoom"],
      _count: {
        _all: true,
      },
    }),
  ]);

  return {
    status: {
      NEW_LAUNCH: newLaunchCount,

      UNDER_CONSTRUCTION:
        possessionStatuses.find(
          (x) => x.possessionStatus === "UNDER_CONSTRUCTION"
        )?._count._all ?? 0,

      READY_TO_MOVE:
        possessionStatuses.find(
          (x) => x.possessionStatus === "READY_TO_MOVE"
        )?._count._all ?? 0,
    },

    types: {
      APARTMENT:
        projectTypes.find((x) => x.projectType === "APARTMENT")?._count._all ??
        0,

      VILLA:
        projectTypes.find((x) => x.projectType === "VILLA")?._count._all ?? 0,

      PLOT:
        projectTypes.find((x) => x.projectType === "PLOT")?._count._all ?? 0,

      BUILDER_FLOOR:
        projectTypes.find(
          (x) => x.projectType === "BUILDER_FLOOR"
        )?._count._all ?? 0,
    },

    bhk: {
      "1":
        bhkCounts.find((x) => x.bedRoom === "1")?._count._all ??
        bhkCounts.find((x) => x.bedRoom === "1 BHK")?._count._all ??
        0,

      "2":
        bhkCounts.find((x) => x.bedRoom === "2")?._count._all ??
        bhkCounts.find((x) => x.bedRoom === "2 BHK")?._count._all ??
        0,

      "3":
        bhkCounts.find((x) => x.bedRoom === "3")?._count._all ??
        bhkCounts.find((x) => x.bedRoom === "3 BHK")?._count._all ??
        0,

      "4":
        bhkCounts.find((x) => x.bedRoom === "4")?._count._all ??
        bhkCounts.find((x) => x.bedRoom === "4 BHK")?._count._all ??
        0,

      "5+":
        bhkCounts
          .filter((x) => x.bedRoom?.startsWith("5"))
          .reduce((sum, x) => sum + x._count._all, 0),
    },
  };
  });
}