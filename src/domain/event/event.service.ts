import { cache } from "react";
import { comparePartialDates } from "@/domain/shared/partial-date";
import { getPersonById } from "@/domain/person/person.repository";
import { personDisplayName } from "@/domain/person/display-name";
import { canView, type ActingMember } from "@/domain/family/permissions";
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
  /** null when the participant Person row no longer resolves (e.g. deleted) — no profile link to build. */
  slug: string | null;
  name: string;
  roleLabel: string;
}

/** Participants of an Event, joined with each Person's display name/slug — the shape event details pages need. */
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
        slug: person?.slug ?? null,
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

/** Wrapped in React.cache so a page's generateMetadata and its own render
 *  (both calling this with the same eventId/familyId) share one query per
 *  request instead of fetching the same row twice. */
export const getEvent = cache(
  async (eventId: string, familyId: string): Promise<EventRecord | null> => {
    return getEventById(eventId, familyId);
  },
);

export async function removeEvent(
  eventId: string,
  familyId: string,
): Promise<boolean> {
  return deleteEvent(eventId, familyId);
}

/** Filters a list of Events down to what `member` may see per the PRIVATE
 *  visibility rule (owner sees everything; everyone else sees non-private
 *  plus their own). Filtering happens in application code, not SQL, for
 *  now — see domain/family/permissions.ts's module doc comment. */
export function filterVisibleEvents(
  events: EventRecord[],
  member: ActingMember,
): EventRecord[] {
  return events.filter((e) =>
    canView(member, {
      privacyLevel: e.privacyLevel,
      createdBy: e.createdBy ?? "",
    }),
  );
}

/** Same IDOR-safe-preserving contract as getVisiblePerson: returns null both
 *  when the Event doesn't exist in this family AND when it exists but
 *  `member` isn't entitled to see it (never leaks which). Page/route
 *  handlers rendering a single Event to the end user must call this, not
 *  the raw getEvent — internal domain code needing the record regardless of
 *  privacy keeps using getEvent directly. */
export async function getVisibleEvent(
  eventId: string,
  familyId: string,
  member: ActingMember,
): Promise<EventRecord | null> {
  const event = await getEvent(eventId, familyId);
  if (!event) return null;
  return canView(member, {
    privacyLevel: event.privacyLevel,
    createdBy: event.createdBy ?? "",
  })
    ? event
    : null;
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
export async function getPersonTimeline(
  personId: string,
  familyId: string,
): Promise<EventRecord[]> {
  const events = await getEventsForPerson(personId, familyId);
  return [...events].sort((a, b) => comparePartialDates(a.date, b.date));
}
