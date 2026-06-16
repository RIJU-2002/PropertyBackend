import { z } from "zod";

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