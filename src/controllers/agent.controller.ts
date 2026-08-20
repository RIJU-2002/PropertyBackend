import { Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  createAgent,
  fetchAgents,
  fetchAgentById,
  updateAgent,
  verifyAgent,
  updateAgentActiveStatus,
  fetchMyAgentProfile,
  updateMyAgentProfile,
  fetchAgentLeads
} from "../services/agent.service";

import {
  createAgentSchema,
  updateAgentSchema,
  updateMyAgentProfileSchema
} from "../validations/agent.validation";

// ============================================================
// CREATE AGENT
// POST /agents
// ============================================================

export const createAgentController = async (
  req: Request,
  res: Response
) => {
  try {
    const parsed = createAgentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const agent = await createAgent(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Agent created successfully",
      data: agent,
    });
  } catch (error: any) {
    console.error("Create agent error:", error);

    switch (error.message) {
      case "USER_NOT_FOUND":
        return res.status(404).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "No user found with that phone or user id",
        });

      case "CANNOT_CONVERT_ADMIN":
        return res.status(409).json({
          success: false,
          code: "CANNOT_CONVERT_ADMIN",
          message: "An admin account cannot be converted to an agent",
        });

      case "AGENT_ALREADY_EXISTS":
        return res.status(409).json({
          success: false,
          message: "This user is already registered as an agent",
        });

      case "RERA_ALREADY_EXISTS":
        return res.status(409).json({
          success: false,
          message: "RERA number already exists",
        });

      default:
        return res.status(500).json({
          success: false,
          message: "Failed to create agent",
        });
    }
  }
};

// ============================================================
// GET ALL AGENTS
// GET /agents
//
// Query:
// ?page=1
// ?limit=20
// ?isVerified=true
// ============================================================

export const getAgentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    let isVerified: boolean | undefined;

    if (req.query.isVerified !== undefined) {
      if (req.query.isVerified === "true") {
        isVerified = true;
      } else if (req.query.isVerified === "false") {
        isVerified = false;
      } else {
        return res.status(400).json({
          success: false,
          message: "isVerified must be true or false",
        });
      }
    }

    const result = await fetchAgents(
      page,
      limit,
      isVerified
    );

    return res.status(200).json({
      success: true,
      data: result.agents,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get agents error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agents",
    });
  }
};

// ============================================================
// GET AGENT BY ID
// GET /agents/:id
// ============================================================

export const getAgentByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId = Number(req.params.id);

    if (!Number.isInteger(agentId) || agentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const agent = await fetchAgentById(agentId);

    return res.status(200).json({
      success: true,
      data: agent,
    });
  } catch (error: any) {
    console.error("Get agent by ID error:", error);

    if (error.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent",
    });
  }
};

// ============================================================
// UPDATE AGENT
// PATCH /agents/:id
//
// Allowed:
// - reraNumber
// - agencyName
// - licenseUrl
// - isActive
//
// Verification is intentionally NOT updated here.
// ============================================================

export const updateAgentController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId = Number(req.params.id);

    if (!Number.isInteger(agentId) || agentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const parsed = updateAgentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const agent = await updateAgent(
      agentId,
      parsed.data
    );

    return res.status(200).json({
      success: true,
      message: "Agent updated successfully",
      data: agent,
    });
  } catch (error: any) {
    console.error("Update agent error:", error);

    switch (error.message) {
      case "AGENT_NOT_FOUND":
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });

      case "RERA_ALREADY_EXISTS":
        return res.status(409).json({
          success: false,
          message: "RERA number already exists",
        });

      default:
        return res.status(500).json({
          success: false,
          message: "Failed to update agent",
        });
    }
  }
};

// ============================================================
// VERIFY / UNVERIFY AGENT
// PATCH /agents/:id/verify
//
// Body:
// {
//   "verified": true
// }
// ============================================================

export const verifyAgentController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId = Number(req.params.id);

    if (!Number.isInteger(agentId) || agentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const { verified } = req.body;

    if (typeof verified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "verified must be a boolean",
      });
    }

    const agent = await verifyAgent(
      agentId,
      verified
    );

    return res.status(200).json({
      success: true,
      message: verified
        ? "Agent verified successfully"
        : "Agent unverified successfully",
      data: agent,
    });
  } catch (error: any) {
    console.error("Verify agent error:", error);

    if (error.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update agent verification",
    });
  }
};

// ============================================================
// ACTIVATE / DEACTIVATE AGENT
// PATCH /agents/:id/activate
//
// Body:
// {
//   "isActive": false
// }
// ============================================================

export const updateAgentActiveStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId = Number(req.params.id);

    if (!Number.isInteger(agentId) || agentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    const agent = await updateAgentActiveStatus(
      agentId,
      isActive
    );

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Agent activated successfully"
        : "Agent deactivated successfully",
      data: agent,
    });
  } catch (error: any) {
    console.error(
      "Update agent active status error:",
      error
    );

    if (error.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update agent status",
    });
  }
};

// ============================================================
// GET MY AGENT PROFILE
// GET /agents/me
// ============================================================

export const getMyAgentProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const agent = await fetchMyAgentProfile(userId);

    return res.status(200).json({
      success: true,
      data: agent,
    });
  } catch (error: any) {
    console.error(
      "Get my agent profile error:",
      error
    );

    if (error.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Agent profile not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent profile",
    });
  }
};

// ============================================================
// UPDATE MY AGENT PROFILE
// PATCH /agents/me
// ============================================================

export const updateMyAgentProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const parsed =
      updateMyAgentProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const agent = await updateMyAgentProfile(
      userId,
      parsed.data
    );

    return res.status(200).json({
      success: true,
      message: "Agent profile updated successfully",
      data: agent,
    });
  } catch (error: any) {
    console.error(
      "Update my agent profile error:",
      error
    );

    switch (error.message) {
      case "AGENT_NOT_FOUND":
        return res.status(404).json({
          success: false,
          message: "Agent profile not found",
        });

      case "RERA_ALREADY_EXISTS":
        return res.status(409).json({
          success: false,
          message: "RERA number already exists",
        });

      default:
        return res.status(500).json({
          success: false,
          message: "Failed to update agent profile",
        });
    }
  }
};

// ============================================================
// GET MY LEADS
// GET /agents/me/leads
//
// Query:
// ?status=NEW
// ?page=1
// ?limit=20
// ============================================================

export const getMyAgentLeadsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Find the Agent profile for this logged-in user
    const agent = await prisma.agent.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        isActive: true,
      },
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

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const result = await fetchAgentLeads(
      agent.id,
      status,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      data: result.leads,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(
      "Get my agent leads error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent leads",
    });
  }
};