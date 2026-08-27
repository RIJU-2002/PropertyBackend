import { z } from "zod";

const LeadStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "SITE_VISIT_SCHEDULED",
  "NEGOTIATING",
  "CONVERTED",
  "LOST",
]);

// ============================================================
// SUBMIT LEAD — used by both guests and logged-in users
// ============================================================

export const submitLeadSchema = z.object({
  // Target — at least one required (validated in service)
  propertyId: z.coerce.number().int().positive().optional(),
  projectId:  z.coerce.number().int().positive().optional(),

  // Guest fields — required only when not logged in (validated in service)
  guestName:  z.string().trim().min(2).max(100).optional(),
  guestPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional(),
  guestEmail: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().email().optional()
  ),

  // Lead details
  message: z
    .string()
    .trim()
    .max(1000, "Message must be under 1000 characters")
    .optional(),

  budget: z
    .string()
    .regex(/^\d+$/, "Budget must be a valid number")
    .optional(),

  bhkPreference: z
    .array(z.number().int().min(1).max(10))
    .max(5)
    .default([]),

  source: z.string().max(50).optional(),

  agentId: z.number().int().positive().optional(),
});

// ============================================================
// UPDATE LEAD STATUS — agent only
// ============================================================

export const updateLeadStatusSchema = z.object({
  status:     LeadStatusEnum,
  notes:      z.string().trim().max(2000).optional(),
  followUpAt: z.string().datetime().optional(),
});

export const assignLeadSchema = z.object({
  // null = unassign (admin CMS)
  agentId: z.number().int().positive().nullable(),
});

export const addLeadRemarkSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Remark cannot be empty")
    .max(2000, "Remark must be under 2000 characters"),
});

export type SubmitLeadInput = z.infer<typeof submitLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type AddLeadRemarkInput = z.infer<typeof addLeadRemarkSchema>;