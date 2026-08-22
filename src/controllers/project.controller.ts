import { Request, Response } from "express";
import {
  fetchProjects,
  fetchProjectBySlug,
  fetchFeaturedProjects,
  fetchProjectsByBuilder,
  fetchProjectById
} from "../services/project.service";
import { serializeBigInt } from "../utils/serializer";
import prisma from "../lib/prisma";
import { cacheRemember } from "../utils/cache";

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

export const getProjectById = async (req: Request, res: Response) => {
  const project = await fetchProjectById(Number(req.params.id));

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  res.json({
    success: true,
    data: serializeBigInt(project),
  });
};

import * as projectService from "../services/project.service";

export async function getFilterCounts(
  req: Request,
  res: Response
) {
  try {
    const data = await projectService.getFilterCounts();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch filter counts",
    });
  }
}

export const getTopInvestmentProjects = async (req: Request, res: Response) => {
  try {
    const cityId = req.query.cityId ? parseInt(req.query.cityId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;

    const projects = await cacheRemember(
      `projects:investment:${cityId ?? "all"}:${limit}`,
      300,
      () =>
        prisma.project.findMany({
      where: {
        isActive: true,
        isInvestmentHotspot: true,
        ...(cityId && { cityId }),
      },
      orderBy: [
        { investmentScore: "desc" },
        { rentalYield: "desc" },
      ],
      take: limit,
      include: {
        city: { select: { name: true } },
        locality: { select: { name: true } },
        images: { where: { isCover: true }, take: 1 },
        configs: true,
      },
    })
    );

    res.json({ success: true, data:serializeBigInt(projects) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch investment projects" });
  }
};