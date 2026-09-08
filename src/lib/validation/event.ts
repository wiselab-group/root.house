import { z } from "zod";

export const privacyLevelSchema = z.enum(["private", "family", "public"]);

export const eventTypeSchema = z.enum([
  "birth",
  "death",
  "marriage",
  "divorce",
  "baptism",
  "migration",
  "emigration",
  "education",
  "military_service",
  "war",
  "occupation",
  "imprisonment",
  "other",
]);

export const createEventSchema = z.object({
  type: eventTypeSchema,
  title: z.string().trim().min(1, "Введите название события").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  placeId: z.string().uuid().optional().or(z.literal("")),
  privacyLevel: privacyLevelSchema.default("family"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
