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

export const EVENT_ROLE_LABELS: Record<string, string> = {
  subject: "участник",
  spouse: "супруг(а)",
  witness: "свидетель",
  godparent: "крёстный",
  participant: "участник",
};
