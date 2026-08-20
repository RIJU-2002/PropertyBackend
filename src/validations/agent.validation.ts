import { z } from "zod";

export const createAgentSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
      .optional(),
    reraNumber: z.string().trim().min(1).max(100).optional(),
    agencyName: z.string().trim().min(2).max(150).optional(),
    licenseUrl: z.string().url().optional(),
  })
  .refine((data) => data.userId || data.phone, {
    message: "Provide userId or phone",
    path: ["phone"],
  });

export const updateAgentSchema = z.object({
  reraNumber: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  agencyName: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .optional(),

  licenseUrl: z
    .string()
    .url()
    .optional(),
});

export const updateMyAgentProfileSchema = z.object({
  reraNumber: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  agencyName: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .optional(),

  licenseUrl: z
    .string()
    .url()
    .optional(),
});