import { Request, Response } from "express";
import { z } from "zod";
import {
  submitLead,
  fetchMyLeads,
  fetchAgentLeads,
  updateLeadStatus,
} from "../services/lead.service";
import {
  submitLeadSchema,
  updateLeadStatusSchema,
} from "../validations/lead.validation";

// ============================================================
// HELPER
// ============================================================

const safe = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

// ============================================================
// POST /leads
// Works for both guests and logged-in users
// ============================================================

export const createLead = async (req: Request, res: Response) => {
  try {
    const validatedData = submitLeadSchema.parse(req.body);

    // null if not logged in — optionalAuth middleware sets this
    const buyerId = (req as any).user?.id ?? null;

    const lead = await submitLead(validatedData, buyerId);

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully. You will be contacted shortly.",
      data:    safe(lead),
    });
  } catch (error: any) {
    console.error("CREATE LEAD ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors:  error.issues.map((i) => ({
          field:   i.path.join("."),
          message: i.message,
        })),
      });
    }

    if (error.message === "MISSING_TARGET") {
      return res.status(400).json({ success: false, message: "Please select a property or project to enquire about" });
    }
    if (error.message === "GUEST_PHONE_REQUIRED") {
      return res.status(400).json({ success: false, message: "Please provide your phone number" });
    }
    if (error.message === "DUPLICATE_LEAD") {
      return res.status(409).json({ success: false, message: "You have already enquired about this property in the last 24 hours" });
    }
    if (error.message === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (error.message === "PROPERTY_NOT_ACTIVE") {
      return res.status(400).json({ success: false, message: "This property listing is no longer active" });
    }
    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.status(500).json({ success: false, message: "Failed to submit enquiry" });
  }
};

// ============================================================
// GET /leads/my
// Buyer sees their own submitted enquiries
// ============================================================

export const getMyLeads = async (req: Request, res: Response) => {
  try {
    const buyerId = (req as any).user?.id;

    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const leads = await fetchMyLeads(buyerId);

    return res.json({ success: true, leads: safe(leads) });
  } catch (error) {
    console.error("GET MY LEADS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

// ============================================================
// GET /leads/agent
// Agent sees all leads assigned to them
// Query: ?status=NEW&page=1&limit=20
// ============================================================

export const getAgentLeads = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user?.id;

    if (!agentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const status = req.query.status as string | undefined;
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;

    const result = await fetchAgentLeads(agentId, status, page, limit);

    return res.json({ success: true, ...safe(result) });
  } catch (error) {
    console.error("GET AGENT LEADS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

// ============================================================
// PATCH /leads/:id/status
// Agent updates lead status through the pipeline
// ============================================================

export const patchLeadStatus = async (req: Request, res: Response) => {
  try {
    const leadId       = Number(req.params.id);
    const agentId      = (req as any).user?.id;
    const requesterRole = (req as any).user?.role;

    if (isNaN(leadId) || leadId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const { status, notes, followUpAt } = updateLeadStatusSchema.parse(req.body);

    const lead = await updateLeadStatus(
      leadId,
      agentId,
      requesterRole,
      status,
      notes,
      followUpAt
    );

    return res.json({
      success: true,
      message: "Lead status updated",
      data:    safe(lead),
    });
  } catch (error: any) {
    console.error("UPDATE LEAD STATUS ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors:  error.issues.map((i) => ({
          field:   i.path.join("."),
          message: i.message,
        })),
      });
    }

    if (error.message === "LEAD_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "You do not have permission to update this lead" });
    }

    return res.status(500).json({ success: false, message: "Failed to update lead status" });
  }
};