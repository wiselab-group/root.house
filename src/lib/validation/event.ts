import { z } from "zod";

export const privacyLevelSchema = z.enum(["private", "family", "public"]);

// birth/death/marriage are excluded — those three types are auto-derived
// onto the timeline from Person.birthDate/deathDate and Partnership.startDate
// (see event.service.ts::synthesizeDerivedEvents) and can no longer be
// created as ordinary `events` rows. Mirrors event-roles.ts's
// MANUAL_EVENT_TYPES — kept as a literal list here since this file must stay
// framework/domain-import-free (validation schemas only).
export const eventTypeSchema = z.enum([
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
  // placeId is not here: PlaceField may post a new place instead of an id —
  // see lib/place-choice.ts::resolvePlaceFields.
  privacyLevel: privacyLevelSchema.default("family"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
