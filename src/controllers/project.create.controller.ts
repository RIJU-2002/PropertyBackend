import { Request, Response } from "express";
import { z } from "zod";
import {
  addProject,
  editProject,
  addProjectImages,
  removeProject,
  addProjectConfigs
} from "../services/project.create.service";
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectConfigsSchema
} from "../validations/project.validation";

// ============================================================
// HELPER
// ============================================================

const safe = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

// ── Parse multipart form fields ────────────────────────────
const toNumber = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

const toBool = (v: any) => v === "true" ? true : v === "false" ? false : undefined;

const parseJsonArray = (value: any) => {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const parseFormFields = (body: any) => {
  return {
    name: body.name ?? body.title ?? undefined,

    builderId: toNumber(body.builderId),
    cityId: toNumber(body.cityId),
    localityId: toNumber(body.localityId),
    stateId: toNumber(body.stateId),

    builderName: body.builderName ?? undefined,
    cityName: body.cityName ?? body.city ?? undefined,
    localityName: body.localityName ?? body.locality ?? undefined,

    minPrice: body.minPrice ? Number(body.minPrice) : undefined,
    maxPrice: body.maxPrice ? Number(body.maxPrice) : undefined,

    description: body.description ?? undefined,
    address: body.address ?? undefined,

    // ADD THESE
    reraNumber: body.reraNumber ?? undefined,
    launchDate: body.launchDate ?? undefined,
    possessionDate: body.possessionDate ?? undefined,

    totalUnits: toNumber(body.totalUnits),
    availableUnits: toNumber(body.availableUnits),

    metaTitle: body.metaTitle ?? undefined,
    metaDescription: body.metaDescription ?? undefined,

    latitude: toNumber(body.latitude),
    longitude: toNumber(body.longitude),

    possessionStatus: body.possessionStatus,

    isFeatured: toBool(body.isFeatured),
    isTrending: toBool(body.isTrending),
    isNewLaunch: toBool(body.isNewLaunch),
    isActive: toBool(body.isActive),

    amenityIds: body.amenityIds ? parseJsonArray(body.amenityIds) : [],
    floorPlans: body.floorPlans ? parseJsonArray(body.floorPlans) : [],
    configs: body.configs ? parseJsonArray(body.configs) : [],
  };
};

// ============================================================
// POST /projects
// Content-Type: multipart/form-data
// ============================================================

export const createProject = async (req: Request, res: Response) => {
  try {
    const parsed        = parseFormFields(req.body);
    console.log("RAW BODY:", req.body);
    console.log("PARSED BODY:", parsed);
    console.log("FILES:", req.files);
    const validatedData = createProjectSchema.parse(parsed);
    console.log("VALIDATED DATA:", validatedData);
    const files         = (req.files as Express.Multer.File[]) ?? [];

    if (files.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Maximum 20 images allowed per project",
      });
    }

    const project = await addProject(validatedData, files);

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data:    safe(project),
    });
  } catch (error: any) {
    console.error("CREATE PROJECT ERROR:", error);

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

    if (error.message === "CITY_NOT_FOUND")     return res.status(400).json({ success: false, message: "City not found" });
    if (error.message === "LOCALITY_NOT_FOUND") return res.status(400).json({ success: false, message: "Locality not found in this city" });
    if (error.message === "STATE_NOT_FOUND")    return res.status(400).json({ success: false, message: "State not found" });
    if (error.message === "BUILDER_NOT_FOUND")  return res.status(400).json({ success: false, message: "Builder not found" });
    if (error.message === "FORBIDDEN")          return res.status(403).json({ success: false, message: "Admin access required" });
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Duplicate record detected",
      });
    }
    return res.status(500).json({ success: false, message: "Failed to create project" });
  }
};

// ============================================================
// PATCH /projects/:id
// ============================================================

export const updateProject = async (req: Request, res: Response) => {
  try {
    const id            = Number(req.params.id);
    const requesterRole = (req as any).user?.role;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const parsed        = parseFormFields(req.body);
    const validatedData = updateProjectSchema.parse(parsed);
    const project       = await editProject(id, validatedData, requesterRole);

    return res.json({
      success: true,
      message: "Project updated successfully",
      data:    safe(project),
    });
  } catch (error: any) {
    console.error("UPDATE PROJECT ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success:  false,
        message:  "Validation failed",
        errors:   error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Project not found" });
    if (error.message === "FORBIDDEN")         return res.status(403).json({ success: false, message: "Admin access required" });

    return res.status(500).json({ success: false, message: "Failed to update project" });
  }
};

// ============================================================
// POST /projects/:id/images
// ============================================================

export const uploadProjectImages = async (req: Request, res: Response) => {
  try {
    const projectId     = Number(req.params.id);
    const requesterRole = (req as any).user?.role;
    const files         = (req.files as Express.Multer.File[]) ?? [];

    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const project = await addProjectImages(projectId, requesterRole, files);

    return res.json({
      success: true,
      message: `${files.length} image(s) uploaded successfully`,
      data:    safe(project),
    });
  } catch (error: any) {
    console.error("UPLOAD PROJECT IMAGES ERROR:", error);

    if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Project not found" });
    if (error.message === "FORBIDDEN")         return res.status(403).json({ success: false, message: "Admin access required" });

    return res.status(500).json({ success: false, message: "Failed to upload images" });
  }
};

// ============================================================
// DELETE /projects/:id
// ============================================================

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id            = Number(req.params.id);
    const requesterRole = (req as any).user?.role;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    await removeProject(id, requesterRole);

    return res.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("DELETE PROJECT ERROR:", error);

    if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Project not found" });
    if (error.message === "FORBIDDEN")         return res.status(403).json({ success: false, message: "Admin access required" });
    if (error.message === "PROJECT_ALREADY_DELETED") {
      return res.status(409).json({
        success: false,
        message: "Project already deleted",
      });
    }

    return res.status(500).json({ success: false, message: "Failed to delete project" });
  }
};


export const updateProjectConfigs = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = Number(req.params.id);

    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const requesterRole = (req as any).user?.role;

    const validated =
      addProjectConfigsSchema.parse(req.body);

    const project = await addProjectConfigs(
      projectId,
      validated.configs,
      requesterRole
    );

    return res.status(200).json({
      success: true,
      message: "Project configs updated successfully",
      data: safe(project),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.issues,
      });
    }

    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (error.message === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update configs",
    });
  }
};