import { z } from "zod";

export const createFamilySchema = z.object({
  name: z.string().trim().min(1, "Введите название семьи").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
