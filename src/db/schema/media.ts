import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { families } from "./family";
import { users } from "./auth";
import { events } from "./event";
import { places } from "./place";
import { stories } from "./story";
import { persons } from "./person";
import { privacyLevelEnum } from "./privacy";

export const mediaKindEnum = pgEnum("media_kind", [
  "photo",
  "video",
  "audio",
  "document",
]);

/**
 * Media — photos/videos/audio/documents. Never embedded directly on Person;
 * a single photo can relate to several people, an event, a place, and a story,
 * so all associations live in join tables below rather than FK columns here.
 *
 * `documentMetadata` absorbs document-specific fields (certificate type, issuer,
 * issued date, ...) for `kind: 'document'` rows instead of a separate Document
 * table — promote to a real table only if document-specific logic (versions,
 * OCR text, ...) actually materializes.
 */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    kind: mediaKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    storageProvider: text("storage_provider").notNull(), // e.g. 'vercel_blob', 'r2' — allows gradual migration
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    title: text("title"),
    description: text("description"),
    documentMetadata: jsonb("document_metadata").$type<Record<
      string,
      unknown
    > | null>(),
    privacyLevel: privacyLevelEnum("privacy_level").notNull().default("family"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("media_family_idx").on(table.familyId)],
);

export const mediaPerson = pgTable(
  "media_person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("media_person_unique").on(table.mediaId, table.personId),
    index("media_person_person_idx").on(table.personId),
  ],
);

export const mediaEvent = pgTable(
  "media_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("media_event_unique").on(table.mediaId, table.eventId),
    index("media_event_event_idx").on(table.eventId),
  ],
);

export const mediaPlace = pgTable(
  "media_place",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("media_place_unique").on(table.mediaId, table.placeId),
  ],
);

export const mediaStory = pgTable(
  "media_story",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("media_story_unique").on(table.mediaId, table.storyId),
  ],
);
