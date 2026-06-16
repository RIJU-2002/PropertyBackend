import { Router } from "express";
import {
  getCities,
  getCityBySlug,
  getLocalitiesByCity,
  searchCitiesAndLocalities,
} from "../controllers/city.controller";

const router = Router();

// IMPORTANT: /search must come before /:slug
// otherwise Express matches "search" as a city slug

router.get("/search",            searchCitiesAndLocalities); // GET /cities/search?q=pat
router.get("/",                  getCities);                 // GET /cities
router.get("/",                  getCities);                 // GET /cities?popular=true
router.get("/:slug",             getCityBySlug);             // GET /cities/bhubaneswar
router.get("/:slug/localities",  getLocalitiesByCity);       // GET /cities/bhubaneswar/localities

export default router;