import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { families } from "./family";
import { users } from "./auth";
import { events } from "./event";
import { places } from "./place";
import { stories } from "./story";
import { persons } from "./person";
import { albums } from "./album";
import { privacyLevelEnum } from "./privacy";

export type MediaVariantName = "thumb" | "display";

export interface MediaVariant {
  storageKey: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export type MediaVariants = Partial<Record<MediaVariantName, MediaVariant>>;

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
    /**
     * Downscaled WebP copies of a photo made at upload time (see
     * domain/media/image-variants.ts) — `thumb` for trees, avatars and
     * grids, `display` for the lightbox, profile hero and story slides. The
     * original at `storageKey` is never altered and is what downloads
     * return. Null for documents, for photos uploaded before variants
     * existed, and whenever processing failed — /api/media then serves the
     * original instead.
     */
    variants: jsonb("variants").$type<MediaVariants | null>(),
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
    /**
     * Manual gallery display order — higher sorts first (newest-uploads-on-
     * top semantics, same direction as the old createdAt DESC default), so
     * a fresh upload getting `max(sortOrder) + 1` lands on top even after a
     * family has hand-reordered older photos. Null for every row created
     * before drag-to-reorder shipped; getMediaFor*'s ORDER BY falls back to
     * createdAt for those so they keep their pre-existing relative order
     * instead of all colliding at the same NULL rank.
     */
    sortOrder: integer("sort_order"),
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
    /**
     * Tap-to-tag point, 0.00–100.00, relative to the rendered (uncropped,
     * object-contain) image's own content box — see photo-lightbox.tsx /
     * photo-tag-layer.tsx. Both null means "tagged in this photo, no
     * specific point" (the pre-existing bulk-tag-at-upload semantics via
     * PersonMultiCombobox); both set means a positioned point-tag. Never
     * one-set-one-null — enforced by media_person_xy_check below.
     */
    xPercent: numeric("x_percent", { precision: 5, scale: 2 }),
    yPercent: numeric("y_percent", { precision: 5, scale: 2 }),
  },
  (table) => [
    uniqueIndex("media_person_unique").on(table.mediaId, table.personId),
    index("media_person_person_idx").on(table.personId),
    check(
      "media_person_xy_check",
      sql`(${table.xPercent} IS NULL) = (${table.yPercent} IS NULL)`,
    ),
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

export const mediaAlbum = pgTable(
  "media_album",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("media_album_unique").on(table.mediaId, table.albumId),
    index("media_album_album_idx").on(table.albumId),
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
