import { z } from "zod";

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const createUserSchema = z
  .object({
    phone: indianPhoneSchema,
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters")
      .optional(),
    email: z.string().trim().email("Enter a valid email address").optional(),
    role: z.enum(["BUYER", "AGENT", "ADMIN"]).default("BUYER"),
    reraNumber: z.string().trim().min(1).max(100).optional(),
    agencyName: z.string().trim().min(2).max(150).optional(),
    licenseUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAgentFields = Boolean(
      data.reraNumber || data.agencyName || data.licenseUrl
    );

    if (data.role !== "AGENT" && hasAgentFields) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agency fields are only allowed when role is AGENT",
        path: ["role"],
      });
    }

    if (data.role === "AGENT" && !data.agencyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agency name is required for agents",
        path: ["agencyName"],
      });
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2,   "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .optional(),

  email: z
    .string()
    .email("Enter a valid email address")
    .optional(),
 
  avatarUrl: z
    .string()
    .url("Avatar must be a valid URL")
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" }
);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;