import { comparePartialDates } from "@/domain/shared/partial-date";
import { getPersonById } from "@/domain/person/person.repository";
import { personDisplayName } from "@/domain/person/display-name";
import { EVENT_ROLE_LABELS } from "./event-roles";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEventsForPerson,
  getParticipantsOf,
  type CreateEventData,
  type EventRecord,
} from "./event.repository";

export type { EventRecord };

export interface EventParticipantWithName {
  personId: string;
  name: string;
  roleLabel: string;
}

/** Participants of an Event, joined with each Person's display name — the shape event details pages need. */
export async function getParticipantsWithNames(
  eventId: string,
  familyId: string,
): Promise<EventParticipantWithName[]> {
  const participants = await getParticipantsOf(eventId, familyId);
  const results = await Promise.all(
    participants.map(async (p) => {
      const person = await getPersonById(p.personId, familyId);
      return {
        personId: p.personId,
        name: person ? personDisplayName(person) : "Неизвестно",
        roleLabel: EVENT_ROLE_LABELS[p.role] ?? p.role,
      };
    }),
  );
  return results;
}

export async function addEvent(data: CreateEventData): Promise<{ id: string }> {
  return createEvent(data);
}

export async function getEvent(eventId: string, familyId: string): Promise<EventRecord | null> {
  return getEventById(eventId, familyId);
}

export async function removeEvent(eventId: string, familyId: string): Promise<boolean> {
  return deleteEvent(eventId, familyId);
}

export async function getParticipants(eventId: string, familyId: string) {
  return getParticipantsOf(eventId, familyId);
}

/**
 * A Person's full timeline: every Event they participate in, sorted
 * chronologically. Events with unknown dates sort last (via
 * comparePartialDates' Infinity-for-unknown behavior) rather than being
 * dropped — an event worth recording is worth showing even if undated.
 */
export async function getPersonTimeline(personId: string, familyId: string): Promise<EventRecord[]> {
  const events = await getEventsForPerson(personId, familyId);
  return [...events].sort((a, b) => comparePartialDates(a.date, b.date));
}
