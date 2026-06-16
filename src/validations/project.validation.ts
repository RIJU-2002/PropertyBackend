import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// ============================================================
// ENUMS
// ============================================================

const PossessionStatusEnum = z.enum([
  "READY_TO_MOVE",
  "UNDER_CONSTRUCTION",
  "NEW_LAUNCH",
]);

// ============================================================
// FLOOR PLAN SCHEMA
// ============================================================

const floorPlanSchema = z.object({
  bhkType: z.number().int().min(1).max(10),
  name: z.string().trim().min(1, "Floor plan name is required"),

  carpetArea: z.number().positive().optional(),
  builtUpArea: z.number().positive().optional(),
  superArea: z.number().positive().optional(),

  price: z
    .string()
    .regex(/^\d+$/, "Price must be a valid number")
    .optional(),
});

// ============================================================
// PROJECT CONFIG SCHEMA
// Shared by Create + Update
// ============================================================


const projectConfigSchema = z.object({
  unitType: z.string(),

  buildAreaRange: z.string().optional(),
  carpetArea: z.string().optional(),

  bedRoom: z.string().optional(),
  livingArea: z.string().optional(),
  kitchen: z.string().optional(),

  balconies: z.string().optional(),
  floorHeight: z.string().optional(),
  flooring: z.string().optional(),

  facing: z.string().optional(),

  pricePerArea: z.string().optional(),

  price: z.coerce.number().positive().optional(),

  units: z.coerce.number().int().positive().optional(),
});

// ============================================================
// BASE PROJECT SCHEMA
// Shared by Create + Update
// ============================================================

const projectBaseSchema = z.object({
  // ── Core ──────────────────────────────────────────────────
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(150, "Project name must be under 150 characters")
    .trim(),

  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be under 5000 characters")
    .trim()
    .optional(),

  // ── Builder ───────────────────────────────────────────────
  builderId: z.coerce.number().optional(),

  builderName: z.string().optional(),

  // ── Location ──────────────────────────────────────────────
  cityId: z.number().int().positive().optional(),
  localityId: z.number().int().positive().optional(),

  cityName: z.string().trim().min(2).max(100).optional(),
  localityName: z.string().trim().min(2).max(100).optional(),
  stateId: z.number().int().positive().optional(),

  address: z
    .string()
    .max(300, "Address cannot exceed 300 characters")
    .trim()
    .optional(),

  // ── Coordinates ───────────────────────────────────────────
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // ── Pricing ───────────────────────────────────────────────
  minPrice: z
    .string()
    .regex(/^\d+$/, "Min price must be a valid number")
    .optional(),

  maxPrice: z
    .string()
    .regex(/^\d+$/, "Max price must be a valid number")
    .optional(),

  // ── Status ────────────────────────────────────────────────
  possessionStatus: PossessionStatusEnum.default(
    "UNDER_CONSTRUCTION"
  ),

  launchDate: z.string().datetime().optional(),
  possessionDate: z.string().datetime().optional(),

  // ── Details ───────────────────────────────────────────────
  reraNumber: z
    .string()
    .max(50)
    .trim()
    .optional(),

  totalUnits: z.number().int().positive().optional(),
  totalTowers: z.number().int().positive().optional(),
  totalFloors: z.number().int().positive().optional(),

  landArea: z.number().positive().optional(),

  // ── SEO ───────────────────────────────────────────────────
  metaTitle: z
    .string()
    .max(160)
    .trim()
    .optional(),

  metaDescription: z
    .string()
    .max(300)
    .trim()
    .optional(),

  // ── Flags ─────────────────────────────────────────────────
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNewLaunch: z.boolean().default(false),

  // ── Amenities ─────────────────────────────────────────────
  amenityIds: z
    .array(z.number().int().positive())
    .default([]),

  // ── Floor Plans ───────────────────────────────────────────
  floorPlans: z
    .array(floorPlanSchema)
    .default([]),

  configs: z
  .array(projectConfigSchema)
  .default([]),
});

// ============================================================
// CREATE PROJECT SCHEMA
// Requires either:
// 1. cityId + localityId
// OR
// 2. cityName + localityName + stateId
// ============================================================

export const createProjectSchema = projectBaseSchema
  .refine(
    (data) => {
      const hasIdBased =
        !!data.cityId && !!data.localityId;

      const hasNameBased =
        !!data.cityName &&
        !!data.localityName &&
        !!data.stateId;

      return hasIdBased || hasNameBased;
    },
    {
      message:
        "Provide either (cityId + localityId) or (cityName + localityName + stateId)",
      path: ["cityId"],
    }
  )
  .refine(
    (data) => {
      if (!data.minPrice || !data.maxPrice) return true;
      return BigInt(data.maxPrice) >= BigInt(data.minPrice);
    },
    {
      message: "Max price must be greater than or equal to min price",
      path: ["maxPrice"],
    }
  )
  .refine(
  (data) => data.builderId || data.builderName,
  {
    message: "Either builderId or builderName is required",
    path: ["builderId"],
  }
);

// ============================================================
// UPDATE PROJECT SCHEMA
// No location validation required.
// Admin-only fields can be added here.
// ============================================================

export const updateProjectSchema = projectBaseSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  });


  export const addProjectConfigsSchema = z.object({
  configs: z.array(
    z.object({
      unitType: z.string(),

      buildAreaRange: z.string().optional(),
      carpetArea: z.string().optional(),

      bedRoom: z.string().optional(),
      livingArea: z.string().optional(),
      kitchen: z.string().optional(),

      balconies: z.string().optional(),
      floorHeight: z.string().optional(),
      flooring: z.string().optional(),

      facing: z.string().optional(),

      pricePerArea: z.string().optional(),

      price: z.coerce.number().positive().optional(),

      units: z.coerce.number().int().positive().optional(),
    })
  ).min(1),
});

// ============================================================
// TYPES
// ============================================================

export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export type UpdateProjectInput = z.infer<
  typeof updateProjectSchema
>;

export type AddProjectConfigsInput =
  z.infer<typeof addProjectConfigsSchema>;
