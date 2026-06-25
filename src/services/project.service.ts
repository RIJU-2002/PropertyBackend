import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { cacheRemember } from "../utils/cache";
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
  minPrice?:         string;
  maxPrice?:         string;
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
    minPrice,
    maxPrice,
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

  if (sort === "price_asc")  orderBy = { minPrice: "asc"     };
  if (sort === "price_desc") orderBy = { minPrice: "desc"    };
  if (sort === "latest")     orderBy = { createdAt: "desc"   };
  if (sort === "popular")    orderBy = { leads: { _count: "desc" } };

  // ── Filters ───────────────────────────────────────────────
  const where: Prisma.ProjectWhereInput = {};

  if (city)             where.city             = { slug: city };
  if (locality)         where.locality         = { slug: locality };
  if (builderId)        where.builderId        = Number(builderId);
  if (possessionStatus) where.possessionStatus = possessionStatus as any;
  if (isFeatured  === "true") where.isFeatured  = true;
  if (isTrending  === "true") where.isTrending  = true;
  if (isNewLaunch === "true") where.isNewLaunch = true;

  if (minPrice || maxPrice) {
    where.minPrice = {};
    if (minPrice) (where.minPrice as any).gte = BigInt(minPrice);
    if (maxPrice) (where.minPrice as any).lte = BigInt(maxPrice);
  }

  // ── Query ─────────────────────────────────────────────────
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
          select: { bhkType: true, price: true, carpetArea: true },
          orderBy: { bhkType: "asc" },
        },
        configs: true,
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
};

// ============================================================
// FETCH SINGLE PROJECT BY SLUG
// Full detail page data
// ============================================================

export const fetchProjectBySlug = async (slug: string) => {
  return prisma.project.findUnique({
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
  });
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
};