import { Request, Response } from "express";
import { z } from "zod";
import {
  submitLead,
  fetchMyLeads,
  fetchAgentLeads,
  updateLeadStatus,
  fetchAdminLeads,
  assignLeadToAgent,
  fetchLeadSummary,
} from "../services/lead.service";
import {
  submitLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
} from "../validations/lead.validation";
import prisma from "../lib/prisma";

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
    if (error.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }
    if (error.message === "AGENT_INACTIVE") {
      return res.status(400).json({ success: false, message: "This agent is inactive" });
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
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId },
      select: { id: true, isActive: true },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent profile not found",
      });
    }

    if (!agent.isActive) {
      return res.status(403).json({
        success: false,
        message: "Agent account is inactive",
      });
    }

    const status = req.query.status as string | undefined;
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;

    const result = await fetchAgentLeads(agent.id, status, page, limit);

    return res.json({ success: true, ...safe(result) });
  } catch (error) {
    console.error("GET AGENT LEADS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

export const getAdminLeads = async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
    const unassigned = req.query.unassigned === "true";
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    if (agentId !== undefined && (!Number.isInteger(agentId) || agentId <= 0)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    const result = await fetchAdminLeads(page, limit, status, agentId, unassigned);

    return res.json({
      success: true,
      data: safe(result.leads),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("GET ADMIN LEADS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

export const getLeadSummary = async (_req: Request, res: Response) => {
  try {
    const summary = await fetchLeadSummary();
    return res.json({ success: true, data: safe(summary) });
  } catch (error) {
    console.error("GET LEAD SUMMARY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch lead summary" });
  }
};

export const assignLead = async (req: Request, res: Response) => {
  try {
    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const { agentId } = assignLeadSchema.parse(req.body);
    const lead = await assignLeadToAgent(leadId, agentId);

    return res.json({
      success: true,
      message: "Lead assigned to agent",
      data: safe(lead),
    });
  } catch (error: any) {
    console.error("ASSIGN LEAD ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    if (error.message === "LEAD_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    if (error.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }
    if (error.message === "AGENT_INACTIVE") {
      return res.status(400).json({ success: false, message: "This agent is inactive" });
    }

    return res.status(500).json({ success: false, message: "Failed to assign lead" });
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