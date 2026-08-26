import { z } from "zod";
import {
  isValidSlugFormat,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
} from "@/domain/family/slug";

export const createFamilySchema = z.object({
  name: z.string().trim().min(1, "Введите название семьи").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;

export const updateFamilyDetailsSchema = z.object({
  name: z.string().trim().min(1, "Введите название семьи").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type UpdateFamilyDetailsInput = z.infer<
  typeof updateFamilyDetailsSchema
>;

/** Confirmation text for irreversible family deletion — the caller must
 *  retype the family's exact current name (see deleteFamilyAction). Just
 *  "non-empty" at the schema layer; the actual name match happens in the
 *  service where the real name is known. */
export const deleteFamilySchema = z.object({
  confirmName: z
    .string()
    .trim()
    .min(1, "Введите название семьи для подтверждения"),
});

export const updateFamilySlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(SLUG_MIN_LENGTH, `Минимум ${SLUG_MIN_LENGTH} символа`)
    .max(SLUG_MAX_LENGTH, `Максимум ${SLUG_MAX_LENGTH} символов`)
    .refine(isValidSlugFormat, {
      message:
        "Только латинские буквы, цифры и дефис — без пробелов и спецсимволов",
    }),
});
