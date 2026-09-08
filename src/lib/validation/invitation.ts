import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
  role: z.enum(["owner", "editor", "contributor", "viewer"]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
