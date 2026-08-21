import { z } from "zod";

/**
 * Shared between the register/login server actions and the Credentials
 * provider's `authorize()` — client-side validation is a UX nicety only,
 * this schema is the actual source of truth (re-validated on the server
 * every time).
 */
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export type Credentials = z.infer<typeof credentialsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
