import { Router } from "express";
import {
  getOverview,
  getProjectGrowth,
  getProjectsByCity,
  getPropertyTypeDistribution,
  getPossessionDistribution,
  getBuilderRanking,
  getDashboardAnalytics,
  getLocalityDistribution
} from "../controllers/analytics.controller";

// import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// ==========================================================
// Dashboard Overview
// ==========================================================
router.get(
  "/overview",
  // authenticate,
  // authorize("ADMIN"),
  getOverview
);

// ==========================================================
// Growth Analytics
// ==========================================================
router.get(
  "/growth/projects",
  // authenticate,
  // authorize("ADMIN"),
  getProjectGrowth
);

// ==========================================================
// Distribution Analytics
// ==========================================================
router.get(
  "/distribution/cities",
  // authenticate,
  // authorize("ADMIN"),
  getProjectsByCity
);

router.get(
  "/distribution/property-types",
  // authenticate,
  // authorize("ADMIN"),
  getPropertyTypeDistribution
);

router.get(
  "/distribution/possession",
  // authenticate,
  // authorize("ADMIN"),
  getPossessionDistribution
);

// ==========================================================
// Rankings
// ==========================================================
router.get(
  "/rankings/builders",
  // authenticate,
  // authorize("ADMIN"),
  getBuilderRanking
);

router.get(
  "/dashboard",
  // authenticate,
  // authorize("ADMIN"),
  getDashboardAnalytics
);

router.get(
  "/distribution/localities",
  getLocalityDistribution
);

export default router;