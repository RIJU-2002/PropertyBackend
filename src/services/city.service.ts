import prisma from "../lib/prisma";
import { cacheRemember } from "../utils/cache";
// ============================================================
// GET ALL CITIES
// Used for: homepage city selector, search dropdown
// ============================================================

export const fetchCities = async (onlyPopular?: boolean) => {

  const cacheKey = `cities:${onlyPopular ? "popular" : "all"}`;

  return cacheRemember(cacheKey, 3600, async () => {
    return prisma.city.findMany({
      where: onlyPopular ? { isPopular: true } : {},
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        isPopular: true,
        _count: {
          select: {
            properties: true,
            projects: true,
          },
        },
      },
      orderBy: [
        { isPopular: "desc" },
        { name: "asc" },
      ],
    });
  });
};

// ============================================================
// GET SINGLE CITY BY SLUG
// Used for: city landing page e.g. /bhubaneswar
// ============================================================

export const fetchCityBySlug = async (slug: string) => {
  return prisma.city.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      isPopular: true,
      _count: {
        select: {
          properties: true,
          projects: true,
        },
      },
    },
  });
};

// ============================================================
// GET LOCALITIES BY CITY
// Used for: locality filter dropdown on search page
// ============================================================

export const fetchLocalitiesByCity = async (citySlug: string) => {
  const city = await prisma.city.findFirst({
    where: { slug: citySlug },
    select: {
      id: true,
      name: true,
    },
  });

  if (!city) throw new Error("CITY_NOT_FOUND");

  const localities = await prisma.locality.findMany({
    where: { cityId: city.id },
    select: {
      id:      true,
      name:    true,
      slug:    true,
      pincode: true,
      _count: {
        select: { properties: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return { city, localities };
};

// ============================================================
// SEARCH CITIES + LOCALITIES
// Used for: main search bar autocomplete
// e.g. user types "pat" → returns Patia, Patan etc.
// ============================================================

export const searchLocations = async (query: string) => {
  if (!query || query.trim().length < 2) return { cities: [], localities: [] };

  const q = query.trim();

  const [cities, localities] = await Promise.all([
    prisma.city.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id:   true,
        name: true,
        slug: true,
        _count: { select: { properties: true } },
      },
      take: 5,
    }),

    prisma.locality.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id:   true,
        name: true,
        slug: true,
        city: { select: { name: true, slug: true } },
        _count: { select: { properties: true } },
      },
      take: 8,
    }),
  ]);

  return { cities, localities };
};


// city.service.ts — add this function

export const findOrCreateLocality = async (
  localityName: string,
  cityId:       number
) => {
  // Normalize — "old patia" and "Old Patia" should be the same
  const name = localityName.trim();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  // Try to find existing locality first
  const existing = await prisma.locality.findFirst({
    where: {
      slug,
      cityId,
    },
  });

  if (existing) return existing; // ← already exists, reuse it

  // Doesn't exist — create it
  return prisma.locality.create({
    data: {
      name,
      slug,
      cityId,
    },
  });
};

export const findOrCreateCity = async (
  cityName:  string,
  stateId:   number
) => {
  const name = cityName.trim();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  const existing = await prisma.city.findFirst({
    where: { slug, stateId },
  });

  if (existing) return existing;

  return prisma.city.create({
    data: { name, slug, stateId },
  });
};