import { z } from "zod";

export const createShareLinkSchema = z.object({
  focusPersonId: z.string().uuid("Выберите человека для фокуса дерева"),
  visibilityScope: z.enum(["public_only", "family_and_public"]),
  expirationPreset: z.enum(["never", "7d", "30d"]),
  // Empty string (no password field filled in) means "no password" — never
  // reject an empty password as "too short", only enforce a minimum length
  // when the owner actually opted into password protection.
  password: z
    .string()
    .trim()
    .refine((v) => v.length === 0 || v.length >= 4, {
      message: "Пароль должен быть не короче 4 символов",
    })
    .optional(),
});

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;

export const verifyShareLinkPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1, "Введите пароль"),
});
