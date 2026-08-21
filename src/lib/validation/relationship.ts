import { z } from "zod";

export const parentRoleSchema = z.enum(["biological", "adoptive", "step", "unknown"]);
export const partnershipStatusSchema = z.enum(["married", "divorced", "widowed", "partnered", "separated"]);

/** "Add existing person as parent/child/spouse" — picks an existing Person by id. */
export const linkExistingPersonSchema = z.object({
  personId: z.string().uuid("Выберите человека из списка"),
});

/** "Add a new person as parent/child" — creates a Person inline, minimal required fields. */
export const linkNewPersonSchema = z.object({
  firstName: z.string().trim().max(120).optional().or(z.literal("")),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  isPlaceholder: z.coerce.boolean().default(false),
});
