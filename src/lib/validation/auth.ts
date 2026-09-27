import { z } from "zod";

/**
 * Shared between the register/login server actions and the Credentials
 * provider's `authorize()` — client-side validation is a UX nicety only,
 * this schema is the actual source of truth (re-validated on the server
 * every time). Custom messages are `validation.*` message keys — see
 * src/i18n/validation.ts.
 */
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("emailInvalid"),
  password: z.string().min(8, "passwordMin"),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "nameRequired").max(120),
});

export type Credentials = z.infer<typeof credentialsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
