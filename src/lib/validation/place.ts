import { z } from "zod";

export const createPlaceSchema = z.object({
  name: z.string().trim().min(1, "Введите название места").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
});

export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
