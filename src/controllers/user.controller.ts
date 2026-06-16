import { Request, Response } from "express";
import { z } from "zod";
import {
  fetchUserProfile,
  updateUserProfile,
  fetchSavedProperties,
  toggleSaveProperty,
  fetchSavedProjects,
  toggleSaveProject,
} from "../services/user.service";
import { updateProfileSchema } from "../validations/user.validation";

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
// GET /users/me
// ============================================================

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user   = await fetchUserProfile(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: safe(user) });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

// ============================================================
// PATCH /users/me
// ============================================================

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId        = (req as any).user?.id;
    const validatedData = updateProfileSchema.parse(req.body);
    const user          = await updateUserProfile(userId, validatedData);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user:    safe(user),
    });
  } catch (error: any) {
    console.error("UPDATE PROFILE ERROR:", error);

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

    if (error.message === "EMAIL_TAKEN") {
      return res.status(409).json({ success: false, message: "This email is already in use" });
    }

    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// ============================================================
// GET /users/me/saved/properties
// ============================================================

export const getSavedProperties = async (req: Request, res: Response) => {
  try {
    const userId     = (req as any).user?.id;
    const properties = await fetchSavedProperties(userId);

    return res.json({ success: true, properties: safe(properties) });
  } catch (error) {
    console.error("GET SAVED PROPERTIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch saved properties" });
  }
};

// ============================================================
// POST /users/me/saved/properties/:propertyId
// Toggles save/unsave
// ============================================================

export const saveProperty = async (req: Request, res: Response) => {
  try {
    const userId     = (req as any).user?.id;
    const propertyId = Number(req.params.propertyId);

    if (isNaN(propertyId) || propertyId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid property ID" });
    }

    const result = await toggleSaveProperty(userId, propertyId);

    return res.json({
      success: true,
      message: result.saved ? "Property saved to shortlist" : "Property removed from shortlist",
      saved:   result.saved,
    });
  } catch (error) {
    console.error("SAVE PROPERTY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update shortlist" });
  }
};

// ============================================================
// GET /users/me/saved/projects
// ============================================================

export const getSavedProjects = async (req: Request, res: Response) => {
  try {
    const userId   = (req as any).user?.id;
    const projects = await fetchSavedProjects(userId);

    return res.json({ success: true, projects: safe(projects) });
  } catch (error) {
    console.error("GET SAVED PROJECTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch saved projects" });
  }
};

// ============================================================
// POST /users/me/saved/projects/:projectId
// Toggles save/unsave
// ============================================================

export const saveProject = async (req: Request, res: Response) => {
  try {
    const userId    = (req as any).user?.id;
    const projectId = Number(req.params.projectId);

    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const result = await toggleSaveProject(userId, projectId);

    return res.json({
      success: true,
      message: result.saved ? "Project saved to shortlist" : "Project removed from shortlist",
      saved:   result.saved,
    });
  } catch (error) {
    console.error("SAVE PROJECT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update shortlist" });
  }
};