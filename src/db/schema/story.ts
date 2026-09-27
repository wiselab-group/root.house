import {
  pgEnum,
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

/**
 * A Story is either still being written (`draft` — visible ONLY to its
 * author, nowhere else in the family archive: not in lists, profiles,
 * counts or the tree) or `published`. Existing rows became `published`
 * when this was added (2026-09-27); a new story starts as a draft the
 * moment «Новая история» opens the editor, so nothing typed is ever lost.
 */
export const storyStatusEnum = pgEnum("story_status", ["draft", "published"]);

/** Story — a family memory/anecdote, optionally linked to people/events/places/media. */
export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    // Human-readable handle, unique per family (not globally — same
    // reasoning as persons.slug in person.ts) — lets a Story be reached at
    // /families/[familySlug]/stories/[slug] instead of a raw UUID. See
    // domain/story/slug.ts.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    privacyLevel: privacyLevelEnum("privacy_level").notNull().default("family"),
    status: storyStatusEnum("status").notNull().default("published"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("stories_family_idx").on(table.familyId),
    index("stories_family_status_author_idx").on(
      table.familyId,
      table.status,
      table.authorId,
    ),
    uniqueIndex("stories_family_slug_unique").on(table.familyId, table.slug),
  ],
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

/**
 * Unsaved edits to an already-PUBLISHED story, per user — the editor
 * autosaves here while someone rewrites a published story, so the family
 * keeps reading the published text until «Сохранить», and the edits follow
 * the writer to another device. One row per (story, user): two editors of
 * the same story never overwrite each other's work in progress. A story
 * that is itself still a draft needs no row here — its own title/body ARE
 * the draft, since only the author can see it anyway.
 */
export const storyDrafts = pgTable(
  "story_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("story_drafts_story_user_unique").on(
      table.storyId,
      table.userId,
    ),
  ],
);
