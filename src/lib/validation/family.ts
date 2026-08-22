import { z } from "zod";
import { isValidSlugFormat, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from "@/domain/family/slug";

export const createFamilySchema = z.object({
  name: z.string().trim().min(1, "Введите название семьи").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;

export const updateFamilySlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(SLUG_MIN_LENGTH, `Минимум ${SLUG_MIN_LENGTH} символа`)
    .max(SLUG_MAX_LENGTH, `Максимум ${SLUG_MAX_LENGTH} символов`)
    .refine(isValidSlugFormat, {
      message: "Только латинские буквы, цифры и дефис — без пробелов и спецсимволов",
    }),
});
