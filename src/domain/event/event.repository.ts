import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, eventParticipants, type PrivacyLevel } from "@/db/schema";
import {
  fromColumns,
  toColumns,
  type PartialDate,
} from "@/domain/shared/partial-date";

export type EventType =
  | "birth"
  | "death"
  | "marriage"
  | "divorce"
  | "baptism"
  | "migration"
  | "emigration"
  | "education"
  | "military_service"
  | "war"
  | "occupation"
  | "imprisonment"
  | "other";

export interface EventRecord {
  id: string;
  familyId: string;
  type: EventType;
  title: string;
  description: string | null;
  date: PartialDate | null;
  endDate: PartialDate | null;
  placeId: string | null;
  privacyLevel: PrivacyLevel;
  createdBy: string | null;
}

export interface EventParticipantRecord {
  id: string;
  eventId: string;
  personId: string;
  role: string;
}

function toRecord(row: typeof events.$inferSelect): EventRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    type: row.type,
    title: row.title,
    description: row.description,
    date: fromColumns({
      year: row.dateYear,
      month: row.dateMonth,
      day: row.dateDay,
      precision: row.datePrecision,
      approximate: row.dateApproximate,
    }),
    endDate: fromColumns({
      year: row.endDateYear,
      month: row.endDateMonth,
      day: row.endDateDay,
      precision: row.endDatePrecision,
      approximate: row.endDateApproximate,
    }),
    placeId: row.placeId,
    privacyLevel: row.privacyLevel,
    createdBy: row.createdBy,
  };
}

/** Fetches an Event scoped to a family in the same query — same IDOR-safe pattern as getPersonById. */
export async function getEventById(
  eventId: string,
  familyId: string,
): Promise<EventRecord | null> {
  const row = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

/** All events a Person participates in, oldest first — the raw material for a Person's timeline. */
export async function getEventsForPerson(
  personId: string,
  familyId: string,
): Promise<EventRecord[]> {
  const rows = await db
    .select({ event: events })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .where(
      and(
        eq(eventParticipants.personId, personId),
        eq(events.familyId, familyId),
      ),
    )
    .orderBy(asc(events.dateYear));

  return rows.map((r) => toRecord(r.event));
}

export async function getParticipantsOf(
  eventId: string,
  familyId: string,
): Promise<EventParticipantRecord[]> {
  const rows = await db
    .select({ participant: eventParticipants })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(events.familyId, familyId),
      ),
    );

  return rows.map((r) => r.participant);
}

export interface CreateEventData {
  familyId: string;
  type: EventType;
  title: string;
  description?: string | null;
  date?: PartialDate | null;
  endDate?: PartialDate | null;
  placeId?: string | null;
  createdBy: string;
  privacyLevel?: PrivacyLevel;
  /** Person ids + role to link as participants, created atomically with the event. */
  participants: Array<{ personId: string; role: string }>;
}

export async function createEvent(
  data: CreateEventData,
): Promise<{ id: string }> {
  const dateCols = toColumns(data.date ?? null);
  const endDateCols = toColumns(data.endDate ?? null);

  const [row] = await db
    .insert(events)
    .values({
      familyId: data.familyId,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      placeId: data.placeId ?? null,
      createdBy: data.createdBy,
      privacyLevel: data.privacyLevel ?? "family",
      dateYear: dateCols.year,
      dateMonth: dateCols.month,
      dateDay: dateCols.day,
      datePrecision: dateCols.precision,
      dateApproximate: dateCols.approximate,
      endDateYear: endDateCols.year,
      endDateMonth: endDateCols.month,
      endDateDay: endDateCols.day,
      endDatePrecision: endDateCols.precision,
      endDateApproximate: endDateCols.approximate,
    })
    .returning({ id: events.id });

  if (data.participants.length > 0) {
    await db.insert(eventParticipants).values(
      data.participants.map((p) => ({
        eventId: row.id,
        personId: p.personId,
        role: p.role,
      })),
    );
  }

  return row;
}

export async function deleteEvent(
  eventId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.familyId, familyId)))
    .returning({ id: events.id });
  return result.length > 0;
}

export type UpdateEventData = Partial<
  Omit<CreateEventData, "familyId" | "createdBy" | "participants">
>;

/** Partial update, same pattern as person.repository.ts::updatePerson — only
 *  patches columns present in `data`, scoped by familyId in the WHERE clause. */
export async function updateEvent(
  eventId: string,
  familyId: string,
  data: UpdateEventData,
): Promise<boolean> {
  const patch: Partial<typeof events.$inferInsert> = {};

  if (data.type !== undefined) patch.type = data.type;
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.placeId !== undefined) patch.placeId = data.placeId;
  if (data.privacyLevel !== undefined) patch.privacyLevel = data.privacyLevel;

  if (data.date !== undefined) {
    const cols = toColumns(data.date);
    patch.dateYear = cols.year;
    patch.dateMonth = cols.month;
    patch.dateDay = cols.day;
    patch.datePrecision = cols.precision;
    patch.dateApproximate = cols.approximate;
  }
  if (data.endDate !== undefined) {
    const cols = toColumns(data.endDate);
    patch.endDateYear = cols.year;
    patch.endDateMonth = cols.month;
    patch.endDateDay = cols.day;
    patch.endDatePrecision = cols.precision;
    patch.endDateApproximate = cols.approximate;
  }

  const result = await db
    .update(events)
    .set(patch)
    .where(and(eq(events.id, eventId), eq(events.familyId, familyId)))
    .returning({ id: events.id });
  return result.length > 0;
}

/** Replaces an Event's full participant list — delete-then-reinsert rather
 *  than diffing, since the set is always small (a handful of people) and
 *  this avoids tracking which rows changed. Doesn't re-check familyId in its
 *  own WHERE (the join table has no familyId column) — the caller must have
 *  already verified the event belongs to `familyId` (event.service.ts::editEvent
 *  does this via updateEvent's own scoped WHERE succeeding first). */
export async function replaceParticipants(
  eventId: string,
  participants: Array<{ personId: string; role: string }>,
): Promise<void> {
  await db
    .delete(eventParticipants)
    .where(eq(eventParticipants.eventId, eventId));

  if (participants.length > 0) {
    await db.insert(eventParticipants).values(
      participants.map((p) => ({
        eventId,
        personId: p.personId,
        role: p.role,
      })),
    );
  }
}
