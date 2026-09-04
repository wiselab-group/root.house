import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { families } from "./family";
import { users } from "./auth";
import { privacyLevelEnum } from "./privacy";
import { events } from "./event";
import { places } from "./place";
import { persons } from "./person";

/** Story — a family memory/anecdote, optionally linked to people/events/places/media. */
export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    privacyLevel: privacyLevelEnum("privacy_level").notNull().default("family"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("stories_family_idx").on(table.familyId)],
);

export const storyPerson = pgTable(
  "story_person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("story_person_unique").on(table.storyId, table.personId),
    index("story_person_person_idx").on(table.personId),
  ],
);

export const storyEvent = pgTable(
  "story_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("story_event_unique").on(table.storyId, table.eventId),
  ],
);

export const storyPlace = pgTable(
  "story_place",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("story_place_unique").on(table.storyId, table.placeId),
  ],
);
