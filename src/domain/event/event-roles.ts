import type { EventType } from "./event.repository";

/**
 * Per-event-type participant role conventions. `event_participants.role` is
 * free text at the database level (see db/schema/event.ts) because the set
 * of valid roles varies too much by event type for one DB enum — this map
 * is where that per-type structure actually lives, used by the UI to offer
 * the right role options when adding a participant to an event.
 */
export const EVENT_ROLES: Record<EventType, string[]> = {
  birth: ["subject"],
  death: ["subject"],
  marriage: ["spouse", "witness"],
  divorce: ["spouse"],
  baptism: ["subject", "godparent"],
  migration: ["subject"],
  emigration: ["subject"],
  education: ["subject"],
  military_service: ["subject"],
  war: ["subject"],
  occupation: ["subject"],
  imprisonment: ["subject"],
  other: ["participant"],
};

/**
 * Types no longer manually creatable via AddEventForm — birth/death are
 * derived from Person.birthDate/deathDate, marriage from
 * Partnership.startDate (see event.service.ts::synthesizeDerivedEvents).
 * Kept as a named export so the form's option list and createEventSchema's
 * rejection both read from one source of truth.
 */
export const MANUAL_EVENT_TYPES = [
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
] as const satisfies readonly EventType[];
