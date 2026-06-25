import { Router } from "express";
import {
  geocodeLocation,
} from "../controllers/geocode.controller";

const router = Router();

router.post(
  "/geocode",
  geocodeLocation
);

export default router;