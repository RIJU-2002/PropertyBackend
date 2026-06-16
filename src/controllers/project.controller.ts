import { Request, Response } from "express";
import {
  fetchProjects,
  fetchProjectBySlug,
  fetchFeaturedProjects,
  fetchProjectsByBuilder,
} from "../services/project.service";

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
// GET /projects
// Query: city, locality, possessionStatus, minPrice, maxPrice,
//        isFeatured, isTrending, isNewLaunch, sort, page, limit
// ============================================================

export const getProjects = async (req: Request, res: Response) => {
  try {
    const result = await fetchProjects(req.query as any);

    return res.json({ success: true, ...safe(result) });
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch projects" });
  }
};

// ============================================================
// GET /projects/featured
// Optional query: ?city=bhubaneswar
// ============================================================

export const getFeaturedProjects = async (req: Request, res: Response) => {
  try {
    const citySlug = req.query.city as string | undefined;
    const projects = await fetchFeaturedProjects(citySlug);

    return res.json({ success: true, projects: safe(projects) });
  } catch (error) {
    console.error("GET FEATURED PROJECTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch featured projects" });
  }
};

// ============================================================
// GET /projects/:slug
// Full project detail page
// ============================================================

export const getProjectBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };

    const project = await fetchProjectBySlug(slug);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.json({ success: true, project: safe(project) });
  } catch (error) {
    console.error("GET PROJECT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch project" });
  }
};

// ============================================================
// GET /projects/builder/:builderSlug
// All projects by a specific builder
// ============================================================

export const getProjectsByBuilder = async (req: Request, res: Response) => {
  try {
    const { builderSlug } = req.params as { builderSlug: string };
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await fetchProjectsByBuilder(builderSlug, page, limit);

    return res.json({ success: true, ...safe(result) });
  } catch (error: any) {
    console.error("GET BUILDER PROJECTS ERROR:", error);

    if (error.message === "BUILDER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Builder not found" });
    }

    return res.status(500).json({ success: false, message: "Failed to fetch builder projects" });
  }
};