import prisma from "../lib/prisma";
import { Prisma, ListingType } from "@prisma/client";
import { cacheRemember } from "../utils/cache";
// ============================================================
// TYPES
// ============================================================

interface NearbyProperty {
  id:               number;
  title:            string;
  slug:             string;
  price:            string;
  bhk:              number | null;
  superArea:        number | null;
  listingType:      string;
  propertyType:     string;
  furnishingStatus: string;
  latitude:         number | null;
  longitude:        number | null;
  distance_meters:  number;
  city_name:        string;
  locality_name:    string;
  cover_image:      string | null;
}

interface NearbyProject {
  id:                number;
  name:              string;
  slug:              string;
  min_price:         string | null;
  max_price:         string | null;
  possession_status: string;
  latitude:          number | null;
  longitude:         number | null;
  distance_meters:   number;
  city_name:         string;
  locality_name:     string;
  cover_image:       string | null;
}

interface Coordinates {
  latitude:  number;
  longitude: number;
}

// ============================================================
// HELPER — validate coordinates
// ============================================================

const validateCoords = (lat: number, lng: number): void => {
  if (lat < -90  || lat > 90)  throw new Error("INVALID_LATITUDE");
  if (lng < -180 || lng > 180) throw new Error("INVALID_LONGITUDE");
};

// ============================================================
// FIND PROPERTIES NEARBY
// Two separate queries to avoid dynamic SQL fragment issue
// ============================================================

export const findPropertiesNearby = async (
  lat: number,
  lng: number,
  radiusKm: number = 5,
  limit: number = 20,
  listingType?: ListingType
): Promise<NearbyProperty[]> => {

  validateCoords(lat, lng);

  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));

  const cacheKey =
    `nearby:properties:${roundedLat}:${roundedLng}:${radiusKm}:${limit}:${listingType ?? "all"}`;

  return cacheRemember(cacheKey, 180, async () => {

    const radiusMeters = radiusKm * 1000;

    // With listingType filter
    if (listingType) {
      return prisma.$queryRaw<NearbyProperty[]>`
        SELECT
          p.id,
          p.title,
          p.slug,
          p.price::text AS price,
          p.bhk,
          p."superArea" AS "superArea",
          p."listingType" AS "listingType",
          p."propertyType" AS "propertyType",
          p."furnishingStatus" AS "furnishingStatus",
          p.latitude,
          p.longitude,

          ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) AS distance_meters,

          c.name AS city_name,
          l.name AS locality_name,

          (
            SELECT url
            FROM "PropertyImage" pi
            WHERE pi."propertyId" = p.id
            AND pi."isCover" = true
            LIMIT 1
          ) AS cover_image

        FROM "Property" p
        JOIN "City" c ON c.id = p."cityId"
        JOIN "Locality" l ON l.id = p."localityId"

        WHERE
          p."isActive" = true
          AND p.location IS NOT NULL
          AND p."listingType" = ${listingType}::"ListingType"

          AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusMeters}
          )

        ORDER BY distance_meters ASC
        LIMIT ${limit}
      `;
    }

    // Without listingType
    return prisma.$queryRaw<NearbyProperty[]>`
      SELECT
        p.id,
        p.title,
        p.slug,
        p.price::text AS price,
        p.bhk,
        p."superArea" AS "superArea",
        p."listingType" AS "listingType",
        p."propertyType" AS "propertyType",
        p."furnishingStatus" AS "furnishingStatus",
        p.latitude,
        p.longitude,

        ST_Distance(
          p.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance_meters,

        c.name AS city_name,
        l.name AS locality_name,

        (
          SELECT url
          FROM "PropertyImage" pi
          WHERE pi."propertyId" = p.id
          AND pi."isCover" = true
          LIMIT 1
        ) AS cover_image

      FROM "Property" p
      JOIN "City" c ON c.id = p."cityId"
      JOIN "Locality" l ON l.id = p."localityId"

      WHERE
        p."isActive" = true
        AND p.location IS NOT NULL

        AND ST_DWithin(
          p.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )

      ORDER BY distance_meters ASC
      LIMIT ${limit}
    `;
  });
};

// ============================================================
// FIND PROJECTS NEARBY
// ============================================================

export const findProjectsNearby = async (
  lat: number,
  lng: number,
  radiusKm: number = 10,
  limit: number = 10
): Promise<NearbyProject[]> => {

  validateCoords(lat, lng);

  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));

  const cacheKey =
    `nearby:projects:${roundedLat}:${roundedLng}:${radiusKm}:${limit}`;

  return cacheRemember(cacheKey, 300, async () => {

    const radiusMeters = radiusKm * 1000;

    return prisma.$queryRaw<NearbyProject[]>`
      SELECT
        p.id,
        p.name,
        p.slug,
        p."minPrice"::text AS min_price,
        p."maxPrice"::text AS max_price,
        p."possessionStatus" AS possession_status,
        p.latitude,
        p.longitude,

        ST_Distance(
          p.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance_meters,

        c.name AS city_name,
        l.name AS locality_name,

        (
          SELECT url
          FROM "ProjectImage" pi
          WHERE pi."projectId" = p.id
          AND pi."isCover" = true
          LIMIT 1
        ) AS cover_image

      FROM "Project" p
      JOIN "City" c ON c.id = p."cityId"
      JOIN "Locality" l ON l.id = p."localityId"

      WHERE
        p.location IS NOT NULL

        AND ST_DWithin(
          p.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )

      ORDER BY distance_meters ASC
      LIMIT ${limit}
    `;
  });
};

// ============================================================
// GET DISTANCE BETWEEN TWO POINTS
// ============================================================

export const getDistanceBetween = async (
  point1: Coordinates,
  point2: Coordinates
): Promise<{ meters: number; label: string }> => {
  validateCoords(point1.latitude, point1.longitude);
  validateCoords(point2.latitude, point2.longitude);

  // Round to 2 decimal places — same nearby points share cache
  const key = `distance:${point1.latitude.toFixed(2)},${point1.longitude.toFixed(2)}:${point2.latitude.toFixed(2)},${point2.longitude.toFixed(2)}`;

  return cacheRemember(key, 86400, async () => { // 24hr — distance never changes
    const result = await prisma.$queryRaw<[{ distance: number }]>`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${point1.longitude}, ${point1.latitude}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${point2.longitude}, ${point2.latitude}), 4326)::geography
      ) AS distance
    `;
    const meters = Number(result[0].distance);
    return { meters, label: formatDistance(meters) };
  });
};

// ============================================================
// FIND LOCALITIES NEARBY
// ============================================================

export const findLocalitiesNearby = async (
  lat: number,
  lng: number,
  radiusKm: number = 10,
  limit: number = 8
) => {

  validateCoords(lat, lng);

  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));

  const cacheKey =
    `nearby:localities:${roundedLat}:${roundedLng}:${radiusKm}:${limit}`;

  return cacheRemember(cacheKey, 600, async () => {

    const radiusMeters = radiusKm * 1000;

    return prisma.$queryRaw<any[]>`
      SELECT
        l.id,
        l.name,
        l.slug,
        l.latitude,
        l.longitude,

        ST_Distance(
          l.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance_meters,

        c.name AS city_name,
        c.slug AS city_slug,

        COUNT(p.id)::int AS property_count

      FROM "Locality" l

      JOIN "City" c
        ON c.id = l."cityId"

      LEFT JOIN "Property" p
        ON p."localityId" = l.id
        AND p."isActive" = true

      WHERE
        l.location IS NOT NULL

        AND ST_DWithin(
          l.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )

      GROUP BY
        l.id,
        l.name,
        l.slug,
        l.latitude,
        l.longitude,
        c.name,
        c.slug

      ORDER BY distance_meters ASC

      LIMIT ${limit}
    `;
  });
};
// ============================================================
// ATTACH DISTANCE TO EXISTING PROPERTY RESULTS
// ============================================================

export const attachDistanceToProperties = async (
  properties: any[],
  userLat:    number,
  userLng:    number
): Promise<any[]> => {
  if (!properties.length) return [];

  validateCoords(userLat, userLng);

  const ids          = properties.map((p) => p.id as number);
  const propertyIds  = [...ids].sort().join(",");
  const roundedLat   = userLat.toFixed(2);
  const roundedLng   = userLng.toFixed(2);
  const key          = `distances:${roundedLat}:${roundedLng}:${propertyIds}`;

  const distanceMap = await cacheRemember(key, 300, async () => {
    const distances = await prisma.$queryRaw<
    
    { id: number; distance_meters: number }[]
    >`
      SELECT
        id,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
        ) AS distance_meters
      FROM "Property"
      WHERE id = ANY(${ids}::int[])
      AND   location IS NOT NULL
    `;

  return Object.fromEntries(
      distances.map((d) => [Number(d.id), d.distance_meters])
    );
  });

  return properties.map((p) => ({
    ...p,
    distance_meters: distanceMap[p.id] ?? null,
    distance_label:  distanceMap[p.id]
      ? formatDistance(distanceMap[p.id])
      : null,
  }));
};

// ============================================================
// FORMAT DISTANCE
// ============================================================

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km < 10)       return `${km.toFixed(1)} km`;
  return               `${Math.round(km)} km`;
};