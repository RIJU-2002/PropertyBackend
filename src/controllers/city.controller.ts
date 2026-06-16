import { Request, Response } from "express";
import {
  fetchCities,
  fetchCityBySlug,
  fetchLocalitiesByCity,
  searchLocations,
} from "../services/city.service";

// ============================================================
// GET /cities
// Query: ?popular=true  → only popular cities
// ============================================================

export const getCities = async (req: Request, res: Response) => {
  try {
    const onlyPopular = req.query.popular === "true";
    const cities = await fetchCities(onlyPopular);

    return res.json({ success: true, cities });
  } catch (error) {
    console.error("GET CITIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cities" });
  }
};

// ============================================================
// GET /cities/:slug
// e.g. GET /cities/bhubaneswar
// ============================================================

export const getCityBySlug = async (req: Request, res: Response) => {
  try {
    const city = await fetchCityBySlug(req.params.slug as string);

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    return res.json({ success: true, city });
  } catch (error) {
    console.error("GET CITY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch city" });
  }
};

// ============================================================
// GET /cities/:slug/localities
// e.g. GET /cities/bhubaneswar/localities
// ============================================================

export const getLocalitiesByCity = async (req: Request, res: Response) => {
  try {
    const result = await fetchLocalitiesByCity(req.params.slug as string);

    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET LOCALITIES ERROR:", error);

    if (error.message === "CITY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    return res.status(500).json({ success: false, message: "Failed to fetch localities" });
  }
};

// ============================================================
// GET /cities/search?q=pat
// Autocomplete — searches both cities and localities
// ============================================================

export const searchCitiesAndLocalities = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const results = await searchLocations(query);

    return res.json({ success: true, ...results });
  } catch (error) {
    console.error("SEARCH LOCATIONS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to search locations" });
  }
};