import { Router } from "express";
import {
  createLead,
  getMyLeads,
  getAgentLeads,
  getAdminLeads,
  getLeadSummary,
  patchLeadStatus,
  assignLead,
  getLeadRemarks,
  createLeadRemark,
} from "../controllers/lead.controller";
import { protect, optionalAuth, adminOnly } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", optionalAuth, createLead);

router.get("/my", protect, getMyLeads);
router.get("/agent", protect, getAgentLeads);
router.get("/summary", protect, adminOnly, getLeadSummary);
router.get("/", protect, adminOnly, getAdminLeads);

router.get("/:id/remarks", protect, getLeadRemarks);
router.post("/:id/remarks", protect, createLeadRemark);

router.patch("/:id/status", protect, patchLeadStatus);
router.patch("/:id/assign", protect, adminOnly, assignLead);

export default router;