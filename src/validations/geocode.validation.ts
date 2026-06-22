import { z } from "zod";

export const geocodeSchema = z.object({
  address: z
    .string()
    .trim()
    .min(3, "Address is required"),
});

export type GeocodeInput =
  z.infer<typeof geocodeSchema>;