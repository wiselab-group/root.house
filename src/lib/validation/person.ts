import { z } from "zod";

const datePrecisionSchema = z.enum(["exact", "year_only", "decade", "unknown"]);

/**
 * A PartialDate as submitted from a form: all string inputs (HTML forms only
 * carry strings), coerced/validated into the shape domain/shared/partial-date
 * expects. Empty year means "unknown" regardless of what precision was picked.
 */
export const partialDateInputSchema = z
  .object({
    year: z.coerce
      .number()
      .int()
      .min(1, "Год должен быть положительным")
      .max(2100)
      .optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    day: z.coerce.number().int().min(1).max(31).optional(),
    precision: datePrecisionSchema.optional(),
    isApproximate: z.coerce.boolean().optional(),
  })
  .optional();

export const genderSchema = z.enum(["male", "female", "unknown"]);

export const createPersonSchema = z.object({
  firstName: z.string().trim().max(120).optional().or(z.literal("")),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  middleName: z.string().trim().max(120).optional().or(z.literal("")),
  maidenName: z.string().trim().max(120).optional().or(z.literal("")),
  nickname: z.string().trim().max(120).optional().or(z.literal("")),
  gender: genderSchema.default("unknown"),
  isLiving: z.coerce.boolean().default(true),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  religion: z.string().trim().max(120).optional().or(z.literal("")),
  nationality: z.string().trim().max(120).optional().or(z.literal("")),
  birthDate: partialDateInputSchema,
  deathDate: partialDateInputSchema,
  // .nullable() alongside .optional(): formData.get() returns null (not
  // undefined) for a field that isn't in the FormData at all — the case
  // whenever isLiving is checked and PersonForm doesn't render the death
  // fields, so deathPlaceId/deathCause is simply absent from what's submitted.
  birthPlaceId: z.string().uuid().optional().nullable().or(z.literal("")),
  deathPlaceId: z.string().uuid().optional().nullable().or(z.literal("")),
  deathCause: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

/**
 * A placeholder Person requires none of the usual fields — "a son existed
 * but his name is unknown" should be representable with zero required input.
 */
export const createPlaceholderPersonSchema = z.object({
  label: z.string().trim().max(120).optional(), // optional free-text hint, e.g. "unnamed son"
  gender: genderSchema.default("unknown"),
});

export type CreatePlaceholderPersonInput = z.infer<
  typeof createPlaceholderPersonSchema
>;
