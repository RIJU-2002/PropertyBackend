import { Router } from "express";
import { fetchAmenities } from "../controllers/amenity.controller";

const router = Router();

router.get("/", fetchAmenities);

export default router;