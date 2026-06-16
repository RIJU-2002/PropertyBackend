import { Request, Response } from "express";
import { ListingType } from "@prisma/client";
import {
  findPropertiesNearby,
  findProjectsNearby,
  findLocalitiesNearby,
  getDistanceBetween,
  attachDistanceToProperties,
} from "../services/location.service";
import { fetchProperties } from "../services/property.service";
import { safeJson } from "../utils/safeJson";

// ============================================================
// HELPER — parse + validate lat/lng from query params
// ============================================================

const parseCoords = (lat: any, lng: any): { lat: number; lng: number } | null => {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) return null;
  if (parsedLat < -90  || parsedLat > 90)   return null;
  if (parsedLng < -180 || parsedLng > 180)  return null;

  return { lat: parsedLat, lng: parsedLng };
};

// ============================================================
// GET /location/properties/nearby
// ============================================================

export const getNearbyProperties = async (req: Request, res: Response) => {
  try {
    const coords = parseCoords(req.query.lat, req.query.lng);

    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query params are required",
      });
    }

    const radius = Math.min(50, Number(req.query.radius) || 5);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const listingTypeParam = req.query.listingType as string | undefined;

    let listingType: ListingType | undefined;

    if (
      listingTypeParam &&
      Object.values(ListingType).includes(listingTypeParam as ListingType)
    ) {
      listingType = listingTypeParam as ListingType;
    }

    const properties = await findPropertiesNearby(
      coords.lat,
      coords.lng,
      radius,
      limit,
      listingType
    );

    return res.json(
      safeJson({
        success: true,
        count: properties.length,
        radius_km: radius,
        properties,
      })
    );
  } catch (error: any) {
    console.error("NEARBY PROPERTIES ERROR:", error);

    if (
      error.message === "INVALID_LATITUDE" ||
      error.message === "INVALID_LONGITUDE"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby properties",
    });
  }
};

// ============================================================
// GET /location/projects/nearby
// ============================================================

export const getNearbyProjects = async (req: Request, res: Response) => {
  try {
    const coords = parseCoords(req.query.lat, req.query.lng);

    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query params are required",
      });
    }

    const radius = Math.min(50, Number(req.query.radius) || 10);
    const limit = Math.min(20, Number(req.query.limit) || 10);

    const projects = await findProjectsNearby(
      coords.lat,
      coords.lng,
      radius,
      limit
    );

    return res.json(
      safeJson({
        success: true,
        count: projects.length,
        radius_km: radius,
        projects,
      })
    );
  } catch (error: any) {
    console.error("NEARBY PROJECTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby projects",
    });
  }
};

// ============================================================
// GET /location/localities/nearby
// ============================================================

export const getNearbyLocalities = async (req: Request, res: Response) => {
  try {
    const coords = parseCoords(req.query.lat, req.query.lng);

    if (!coords) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query params are required",
      });
    }

    const radius = Math.min(30, Number(req.query.radius) || 10);
    const limit = Math.min(20, Number(req.query.limit) || 8);

    const localities = await findLocalitiesNearby(
      coords.lat,
      coords.lng,
      radius,
      limit
    );

    return res.json(
      safeJson({
        success: true,
        count: localities.length,
        radius_km: radius,
        localities,
      })
    );
  } catch (error: any) {
    console.error("NEARBY LOCALITIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby localities",
    });
  }
};

// ============================================================
// GET /location/distance
// ============================================================

export const getDistance = async (req: Request, res: Response) => {
  try {
    const point1 = parseCoords(req.query.lat1, req.query.lng1);
    const point2 = parseCoords(req.query.lat2, req.query.lng2);

    if (!point1 || !point2) {
      return res.status(400).json({
        success: false,
        message: "Provide lat1, lng1, lat2, lng2 as query params",
      });
    }

    const result = await getDistanceBetween(
      { latitude: point1.lat, longitude: point1.lng },
      { latitude: point2.lat, longitude: point2.lng }
    );

    return res.json(
      safeJson({
        success: true,
        ...result,
      })
    );
  } catch (error) {
    console.error("GET DISTANCE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate distance",
    });
  }
};

// ============================================================
// GET /location/properties/search-with-distance
// ============================================================

export const searchPropertiesWithDistance = async (
  req: Request,
  res: Response
) => {
  try {
    const coords = parseCoords(req.query.lat, req.query.lng);

    const result = await fetchProperties(req.query as any);

    if (coords && result.properties.length > 0) {
      const withDistance = await attachDistanceToProperties(
        result.properties,
        coords.lat,
        coords.lng
      );

      return res.json(
        safeJson({
          success: true,
          ...result,
          properties: withDistance,
        })
      );
    }

    return res.json(
      safeJson({
        success: true,
        ...result,
      })
    );
  } catch (error) {
    console.error("SEARCH WITH DISTANCE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
};