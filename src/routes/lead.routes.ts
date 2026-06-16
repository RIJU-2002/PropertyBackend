import { Router } from "express";
import {
  createLead,
  getMyLeads,
  getAgentLeads,
  patchLeadStatus,
} from "../controllers/lead.controller";
import { protect, optionalAuth } from "../middlewares/auth.middleware";

const router = Router();

// POST /leads — works for guests AND logged-in users
// optionalAuth attaches req.user if token exists, but doesn't block guests
router.post("/", optionalAuth, createLead);

// GET /leads/my — buyer sees their own leads
router.get("/my", protect, getMyLeads);

// GET /leads/agent — agent sees leads assigned to them
// Query: ?status=NEW&page=1&limit=20
router.get("/agent", protect, getAgentLeads);

// PATCH /leads/:id/status — agent updates lead pipeline status
router.patch("/:id/status", protect, patchLeadStatus);

export default router;