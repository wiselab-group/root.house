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

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birth: "Рождение",
  death: "Смерть",
  marriage: "Свадьба",
  divorce: "Развод",
  baptism: "Крещение",
  migration: "Переезд",
  emigration: "Эмиграция",
  education: "Образование",
  military_service: "Военная служба",
  war: "Война",
  occupation: "Профессия",
  imprisonment: "Заключение",
  other: "Другое",
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

export const MANUAL_EVENT_TYPE_LABELS: Record<
  (typeof MANUAL_EVENT_TYPES)[number],
  string
> = Object.fromEntries(
  MANUAL_EVENT_TYPES.map((type) => [type, EVENT_TYPE_LABELS[type]]),
) as Record<(typeof MANUAL_EVENT_TYPES)[number], string>;

export const EVENT_ROLE_LABELS: Record<string, string> = {
  subject: "участник",
  spouse: "супруг(а)",
  witness: "свидетель",
  godparent: "крёстный",
  participant: "участник",
};
