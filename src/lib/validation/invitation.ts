import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("emailInvalid"),
  role: z.enum(["owner", "editor", "contributor", "viewer"]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
