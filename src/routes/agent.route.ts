import { Router } from "express";

import {
  createAgentController,
  getAgentsController,
  getAgentByIdController,
  updateAgentController,
  verifyAgentController,
  updateAgentActiveStatusController,
  getMyAgentLeadsController,
  getMyAgentProfileController,
  updateMyAgentProfileController
} from "../controllers/agent.controller";

import { protect, adminOnly } from "../middlewares/auth.middleware";

const router = Router();

/**
 * ============================================================
 * AGENT ROUTES
 * ============================================================
 *
 * POST   /agents
 * GET    /agents
 * GET    /agents/:id
 * PATCH  /agents/:id
 * PATCH  /agents/:id/verify
 * PATCH  /agents/:id/activate
 *
 * All agent-management routes are ADMIN-only.
 * ============================================================
 */


/**
 * CREATE AGENT
 *
 * POST /agents
 *
 * Creates an Agent profile for an existing User (by userId or phone)
 * and sets User.role to AGENT.
 *
 * Admin only.
 */
router.post(
  "/",
  protect,
  adminOnly,
  createAgentController
);


/**
 * GET ALL AGENTS
 *
 * GET /agents
 *
 * Optional query parameters:
 *
 * ?page=1
 * ?limit=20
 * ?isVerified=true
 *
 * Admin only.
 */
router.get(
  "/",
  protect,
  adminOnly,
  getAgentsController
);

// /me routes FIRST
router.get("/me", protect, getMyAgentProfileController);
router.patch("/me", protect, updateMyAgentProfileController);
router.get("/me/leads", protect, getMyAgentLeadsController);

// Then dynamic :id routes
router.get("/:id", protect, adminOnly, getAgentByIdController);
router.patch("/:id", protect, adminOnly, updateAgentController);
router.patch("/:id/verify", protect, adminOnly, verifyAgentController);
router.patch("/:id/activate", protect, adminOnly, updateAgentActiveStatusController);


export default router;