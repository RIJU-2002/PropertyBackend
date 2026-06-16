import { z } from "zod";

// ============================================================
// ENUMS — must match your Prisma schema exactly
// ============================================================

const PropertyTypeEnum = z.enum([
  "APARTMENT",
  "VILLA",
  "PLOT",
  "INDEPENDENT_HOUSE",
  "BUILDER_FLOOR",
  "PENTHOUSE",
  "STUDIO",
  "COMMERCIAL_OFFICE",
  "COMMERCIAL_SHOP",
  "WAREHOUSE",
]);

const ListingTypeEnum = z.enum(["BUY", "RENT", "PG"]);

const TransactionTypeEnum = z.enum(["NEW_PROPERTY", "RESALE"]);

const PossessionStatusEnum = z.enum([
  "READY_TO_MOVE",
  "UNDER_CONSTRUCTION",
  "NEW_LAUNCH",
]);

const FurnishingStatusEnum = z.enum([
  "UNFURNISHED",
  "SEMI_FURNISHED",
  "FULLY_FURNISHED",
]);

const FacingEnum = z.enum([
  "North",
  "South",
  "East",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
]);

// ============================================================
// CREATE PROPERTY SCHEMA
// ============================================================

export const createPropertySchema = z.object({
  // ── Core ──────────────────────────────────────────────────
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(150, "Title must be under 150 characters")
    .trim(),

  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be under 5000 characters")
    .trim()
    .optional(),

  // ── Type ──────────────────────────────────────────────────
  propertyType:    PropertyTypeEnum,
  listingType:     ListingTypeEnum,
  transactionType: TransactionTypeEnum.default("RESALE"),

  // ── Location ──────────────────────────────────────────────
  // FIX: use .min(1, message) instead of required_error (removed in Zod v4)
  cityId:     z.number({ message: "City is required" }).int().positive(),
  localityId: z.number({ message: "Locality is required" }).int().positive(),
  projectId:  z.number().int().positive().optional(),
  address:    z.string().max(300).trim().optional(),
  latitude:   z.number().min(-90).max(90).optional(),
  longitude:  z.number().min(-180).max(180).optional(),

  // ── Size ──────────────────────────────────────────────────
  bhk:         z.number().int().min(1).max(10).optional(),
  bathrooms:   z.number().int().min(1).max(10).optional(),
  balconies:   z.number().int().min(0).max(10).optional(),
  carpetArea:  z.number().positive().optional(),
  builtUpArea: z.number().positive().optional(),
  superArea:   z.number().positive().optional(),
  totalFloors: z.number().int().positive().optional(),
  floorNumber: z.number().int().min(0).optional(),

  // ── Pricing ───────────────────────────────────────────────
  price: z
    .string({ message: "Price is required" })
    .regex(/^\d+$/, "Price must be a valid number")
    .refine((v) => BigInt(v) > 0n, "Price must be greater than 0"),

  pricePerSqFt:      z.number().positive().optional(),
  isNegotiable:      z.boolean().default(false),
  maintenanceCharge: z.number().positive().optional(),
  securityDeposit:   z.number().positive().optional(),

  // ── Status ────────────────────────────────────────────────
  possessionStatus: PossessionStatusEnum.default("READY_TO_MOVE"),
  furnishingStatus: FurnishingStatusEnum.default("UNFURNISHED"),
  availableFrom:    z.string().datetime().optional(),

  // ── Features ──────────────────────────────────────────────
  features:    z.array(z.string().trim()).max(20).default([]),
  overlooking: z.array(z.string().trim()).max(10).default([]),
  facing:      FacingEnum.optional(),
});

// ============================================================
// UPDATE PROPERTY SCHEMA — all fields optional
// ============================================================

export const updatePropertySchema = createPropertySchema
  .partial()
  .omit({ listingType: true, propertyType: true })
  .extend({
    isActive: z.boolean().optional(),
  });

// ============================================================
// CREATE PROPERTY FROM PROJECT SCHEMA
// Only essential fields — rest auto-filled from project
// ============================================================

export const createPropertyFromProjectSchema = z.object({
  bhk: z.number().int().min(1).max(10),
  propertyType: PropertyTypeEnum,
  superArea: z.number().positive(),
  carpetArea: z.number().positive(),
  balconies: z.number().int().min(0).max(10).optional(),
  floorNumber: z.number().int().min(0).optional(),
  facing: FacingEnum.optional(),
  pricePerSqFt: z.number().positive(),
  ownerId: z.number().int().positive(),
  features: z.array(z.string().trim()).max(20).default([]),
  title: z.string().min(5).max(150).trim().optional(),
  description: z.string().max(500).trim().optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreatePropertyFromProjectInput = z.infer<
  typeof createPropertyFromProjectSchema
>;