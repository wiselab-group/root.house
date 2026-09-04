import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, eventParticipants } from "@/db/schema";
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
  privacyLevel: "private" | "family" | "public";
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
    await db
      .insert(eventParticipants)
      .values(
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
