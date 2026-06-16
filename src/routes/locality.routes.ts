import { Router } from "express";
import {
  getNearbyProperties,
  getNearbyProjects,
  getNearbyLocalities,
  getDistance,
  searchPropertiesWithDistance,
} from "../controllers/locality.controller";

const router = Router();

// All location routes are public — no auth needed
// Users share location from the browser

router.get("/properties/nearby",           getNearbyProperties);          // GET /location/properties/nearby?lat=20.35&lng=85.81&radius=5
router.get("/properties/search",           searchPropertiesWithDistance);  // GET /location/properties/search?lat=20.35&lng=85.81&bhk=3
router.get("/projects/nearby",             getNearbyProjects);             // GET /location/projects/nearby?lat=20.35&lng=85.81&radius=10
router.get("/localities/nearby",           getNearbyLocalities);           // GET /location/localities/nearby?lat=20.35&lng=85.81
router.get("/distance",                    getDistance);                   // GET /location/distance?lat1=20.35&lng1=85.81&lat2=20.25&lng2=85.77

export default router;