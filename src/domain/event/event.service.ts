import { cache } from "react";
import { comparePartialDates } from "@/domain/shared/partial-date";
import { getPersonById } from "@/domain/person/person.repository";
import type { PersonRecord } from "@/domain/person/person.repository";
import { personDisplayName } from "@/domain/person/display-name";
import { canView, type ActingMember } from "@/domain/family/permissions";
import { logActivity } from "@/domain/activity-log/activity-log.service";
import { getPartnershipsOf } from "@/domain/relationship/relationship.repository";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";
import { EVENT_ROLE_LABELS, EVENT_TYPE_LABELS } from "./event-roles";
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
  const result = await createEvent(data);

  await logActivity({
    familyId: data.familyId,
    actorId: data.createdBy,
    action: "create",
    entityType: "event",
    entityId: result.id,
    entityLabel: data.title,
  });

  return result;
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
  actorId: string,
): Promise<boolean> {
  const event = await getEvent(eventId, familyId);
  const deleted = await deleteEvent(eventId, familyId);

  if (deleted && event) {
    await logActivity({
      familyId,
      actorId,
      action: "delete",
      entityType: "event",
      entityId: eventId,
      entityLabel: event.title,
    });
  }

  return deleted;
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

const SYNTHETIC_PREFIX = "synthetic:";

/** Whether an EventRecord's id is a synthesized pseudo-event (see
 *  synthesizeDerivedEvents), never a real row in `events` — used by the
 *  timeline UI to skip rendering a details link/delete action for it. */
export function isSyntheticEventId(id: string): boolean {
  return id.startsWith(SYNTHETIC_PREFIX);
}

/**
 * Birth/death/marriage pseudo-Events for a Person's timeline, sourced from
 * Person.birthDate/deathDate and Partnership.startDate — never from real
 * `events` rows, since those three types can no longer be manually created
 * (see createEventSchema in lib/validation/event.ts). Ids are namespaced
 * strings, never real uuids, so they can't collide with a genuine Event id.
 */
function synthesizeDerivedEvents(
  person: PersonRecord,
  partnerships: PartnershipRecord[],
): EventRecord[] {
  const derived: EventRecord[] = [];

  if (person.birthDate) {
    derived.push({
      id: `${SYNTHETIC_PREFIX}birth:${person.id}`,
      familyId: person.familyId,
      type: "birth",
      title: EVENT_TYPE_LABELS.birth,
      description: null,
      date: person.birthDate,
      endDate: null,
      placeId: person.birthPlaceId,
      privacyLevel: person.privacyLevel,
      createdBy: person.createdBy,
    });
  }

  if (person.deathDate) {
    derived.push({
      id: `${SYNTHETIC_PREFIX}death:${person.id}`,
      familyId: person.familyId,
      type: "death",
      title: EVENT_TYPE_LABELS.death,
      description: null,
      date: person.deathDate,
      endDate: null,
      placeId: person.deathPlaceId,
      privacyLevel: person.privacyLevel,
      createdBy: person.createdBy,
    });
  }

  for (const partnership of partnerships) {
    if (!partnership.startDate) continue; // partnership with no known date — nothing to place on the timeline
    derived.push({
      id: `${SYNTHETIC_PREFIX}marriage:${partnership.id}`,
      familyId: partnership.familyId,
      type: "marriage",
      title: EVENT_TYPE_LABELS.marriage,
      description: null,
      date: partnership.startDate,
      endDate: null,
      placeId: null,
      privacyLevel: "family",
      createdBy: null,
    });
  }

  return derived;
}

/**
 * A Person's full timeline: every Event they participate in, plus derived
 * birth/death/marriage pseudo-events (synthesizeDerivedEvents), sorted
 * chronologically. Events with unknown dates sort last (via
 * comparePartialDates' Infinity-for-unknown behavior) rather than being
 * dropped — an event worth recording is worth showing even if undated.
 */
export async function getPersonTimeline(
  personId: string,
  familyId: string,
): Promise<EventRecord[]> {
  const [events, person, partnerships] = await Promise.all([
    getEventsForPerson(personId, familyId),
    getPersonById(personId, familyId),
    getPartnershipsOf(personId, familyId),
  ]);

  const derived = person ? synthesizeDerivedEvents(person, partnerships) : [];

  return [...events, ...derived].sort((a, b) =>
    comparePartialDates(a.date, b.date),
  );
}
