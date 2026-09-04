import {
  pgTable,
  text,
  timestamp,
  uuid,
  smallint,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { families } from "./family";
import { places } from "./place";
import { persons } from "./person";
import { privacyLevelEnum } from "./privacy";

export const eventTypeEnum = pgEnum("event_type", [
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

/**
 * Event — anything that happens to one or more Persons at a point (or range)
 * in time. Occupation/education history lives here rather than as Person
 * fields, so "was a teacher 1960-1975, then a factory foreman" is representable
 * without inventing separate tables per career fact.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),

    dateYear: smallint("date_year"),
    dateMonth: smallint("date_month"),
    dateDay: smallint("date_day"),
    datePrecision: text("date_precision"),
    dateApproximate: boolean("date_approximate"),

    // end date supports ranges, e.g. military service 1941-1945
    endDateYear: smallint("end_date_year"),
    endDateMonth: smallint("end_date_month"),
    endDateDay: smallint("end_date_day"),
    endDatePrecision: text("end_date_precision"),
    endDateApproximate: boolean("end_date_approximate"),

    placeId: uuid("place_id").references(() => places.id, {
      onDelete: "set null",
    }),
    privacyLevel: privacyLevelEnum("privacy_level").notNull().default("family"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("events_family_type_idx").on(table.familyId, table.type),
    index("events_family_year_idx").on(table.familyId, table.dateYear),
  ],
);

/**
 * EventParticipant — links Persons to an Event with a role. `role` is free
 * text rather than a DB enum because the valid roles depend on the event type
 * (groom/bride for marriage, subject for birth/death, ...) — that mapping
 * lives in the domain layer (EVENT_ROLES), not as a database constraint.
 */
export const eventParticipants = pgTable(
  "event_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("participant"),
  },
  (table) => [
    uniqueIndex("event_participants_unique").on(
      table.eventId,
      table.personId,
      table.role,
    ),
    index("event_participants_person_idx").on(table.personId),
  ],
);
