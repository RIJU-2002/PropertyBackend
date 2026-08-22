import { Request, Response } from "express";
import analyticsService from "../services/analytics.service";

// ==========================================================
// Dashboard Overview
// GET /analytics/overview
// ==========================================================
export const getOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await analyticsService.getOverview();

    res.status(200).json({
      success: true,
      message: "Dashboard overview fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Overview Analytics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard overview.",
    });
  }
};

// ==========================================================
// Project Growth
// GET /analytics/growth/projects
// ==========================================================
export const getProjectGrowth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await analyticsService.getProjectGrowth();

    res.status(200).json({
      success: true,
      message: "Project growth fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Project Growth Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch project growth.",
    });
  }
};

// ==========================================================
// Projects By City
// GET /analytics/distribution/cities
// ==========================================================
export const getProjectsByCity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data =
      await analyticsService.getProjectsByCity();

    res.status(200).json({
      success: true,
      message: "Projects by city fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Projects By City Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch city distribution.",
    });
  }
};

// ==========================================================
// Property Type Distribution
// GET /analytics/distribution/property-types
// ==========================================================
export const getPropertyTypeDistribution = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data =
      await analyticsService.getPropertyTypeDistribution();

    res.status(200).json({
      success: true,
      message:
        "Property type distribution fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "Property Type Distribution Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch property type distribution.",
    });
  }
};

// ==========================================================
// Possession Status Distribution
// GET /analytics/distribution/possession
// ==========================================================
export const getPossessionDistribution = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data =
      await analyticsService.getPossessionDistribution();

    res.status(200).json({
      success: true,
      message:
        "Possession status distribution fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "Possession Distribution Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch possession distribution.",
    });
  }
};

// ==========================================================
// Builder Rankings
// GET /analytics/rankings/builders
// ==========================================================
export const getBuilderRanking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data =
      await analyticsService.getBuilderRanking();

    res.status(200).json({
      success: true,
      message: "Builder rankings fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Builder Ranking Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch builder rankings.",
    });
  }
};

// ==========================================================
// Dashboard Analytics
// GET /analytics/dashboard
// ==========================================================
export const getDashboardAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data =
      await analyticsService.getDashboardAnalytics();

    res.status(200).json({
      success: true,
      message: "Dashboard analytics fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard analytics.",
    });
  }
};

export const getLocalityDistribution = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data =
      await analyticsService.getLocalityDistribution();

    res.status(200).json({
      success: true,
      message:
        "Locality distribution fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "Locality Distribution Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch locality distribution.",
    });
  }
};