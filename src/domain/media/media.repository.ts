import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import {
  media,
  mediaPerson,
  mediaAlbum,
  mediaStory,
  mediaEvent,
  mediaPlace,
  persons,
  albums,
  type MediaVariants,
  type PrivacyLevel,
} from "@/db/schema";

export interface MediaRecord {
  id: string;
  familyId: string;
  kind: "photo" | "video" | "audio" | "document";
  storageKey: string;
  storageProvider: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  /** Downscaled copies of a photo — see db/schema/media.ts's own doc comment. */
  variants: MediaVariants | null;
  privacyLevel: PrivacyLevel;
  uploadedBy: string;
  sortOrder: number | null;
  createdAt: Date;
}

/** Lean projection of a Person tagged on a photo — enough for personDisplayName + a profile link. */
export interface MediaTaggedPerson {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  photoMediaId: string | null;
  /** Tap-to-tag point, 0–100, or null for an untagged/positionless mediaPerson row. */
  xPercent: number | null;
  yPercent: number | null;
}

/** Lean projection of an Album a photo belongs to — enough for a chip/link, no need for the full AlbumRecord. */
export interface MediaTaggedAlbum {
  id: string;
  name: string;
}

function toRecord(row: typeof media.$inferSelect): MediaRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    kind: row.kind,
    storageKey: row.storageKey,
    storageProvider: row.storageProvider,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    title: row.title,
    description: row.description,
    variants: row.variants,
    privacyLevel: row.privacyLevel,
    uploadedBy: row.uploadedBy,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

/**
 * Shared ORDER BY for every gallery query — sortOrder DESC (nulls last) with
 * createdAt DESC as the tiebreaker/fallback. Manually reordered photos carry
 * an explicit sortOrder and always sort by it; photos never touched by
 * drag-to-reorder are all NULL and fall through to their pre-existing
 * newest-first createdAt order, so a family that never reorders sees no
 * behavior change at all.
 */
const GALLERY_ORDER = [
  sql`${media.sortOrder} DESC NULLS LAST`,
  desc(media.createdAt),
];

/** Fetches Media scoped to a family in the same query — same IDOR-safe pattern as getPersonById. */
export async function getMediaById(
  mediaId: string,
  familyId: string,
): Promise<MediaRecord | null> {
  const row = await db.query.media.findFirst({
    where: and(eq(media.id, mediaId), eq(media.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

/** All photo Media linked to a given Person, in gallery order (see GALLERY_ORDER) — the raw material for a Person's photo gallery. Excludes kind='document' — see getDocumentsForPerson for that. */
export async function getMediaForPerson(
  personId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  const rows = await db
    .select({ media })
    .from(mediaPerson)
    .innerJoin(media, eq(mediaPerson.mediaId, media.id))
    .where(
      and(
        eq(mediaPerson.personId, personId),
        eq(media.familyId, familyId),
        eq(media.kind, "photo"),
      ),
    )
    .orderBy(...GALLERY_ORDER);

  return rows.map((r) => toRecord(r.media));
}

/** All photo Media attached to a Story, in gallery order — the Story page's
 *  hero carousel. Family-scoped in the same query (IDOR-safe, see
 *  getMediaById), photos only. */
export async function getPhotosForStory(
  storyId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  const rows = await db
    .select({ media })
    .from(mediaStory)
    .innerJoin(media, eq(mediaStory.mediaId, media.id))
    .where(
      and(
        eq(mediaStory.storyId, storyId),
        eq(media.familyId, familyId),
        eq(media.kind, "photo"),
      ),
    )
    .orderBy(...GALLERY_ORDER);

  return rows.map((r) => toRecord(r.media));
}

/** All document Media linked to a given Person, in gallery order (see
 *  GALLERY_ORDER) — the raw material for a Person's Документы section.
 *  Mirrors getMediaForPerson's shape exactly, filtered to kind='document'
 *  instead of 'photo' — the two never mix in one query so a caller can't
 *  accidentally render a document tile in a photo grid or vice versa. */
export async function getDocumentsForPerson(
  personId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  const rows = await db
    .select({ media })
    .from(mediaPerson)
    .innerJoin(media, eq(mediaPerson.mediaId, media.id))
    .where(
      and(
        eq(mediaPerson.personId, personId),
        eq(media.familyId, familyId),
        eq(media.kind, "document"),
      ),
    )
    .orderBy(...GALLERY_ORDER);

  return rows.map((r) => toRecord(r.media));
}

/**
 * All photo Media belonging to a family, in gallery order (see
 * GALLERY_ORDER) — the raw material for the family-wide gallery
 * (/families/[slug]/photos). Queries `media`
 * directly rather than joining through media_person like getMediaForPerson
 * does, because this must also include photos not (yet) tagged to anyone.
 *
 * Excludes any Media currently set as someone's avatar (persons.photoMediaId)
 * — an avatar is deliberately never linked via media_person (see
 * media.service.ts::uploadPersonAvatar) precisely so it doesn't appear
 * alongside gallery photos; without this filter it would still surface here
 * untagged, and deleting it from this page would silently break that
 * person's profile picture (photoMediaId has no DB-level FK to enforce it).
 */
export async function getMediaForFamily(
  familyId: string,
): Promise<MediaRecord[]> {
  const rows = await db.query.media.findMany({
    where: and(
      eq(media.familyId, familyId),
      eq(media.kind, "photo"),
      notInArray(media.id, avatarMediaIdsSubquery(familyId)),
    ),
    orderBy: () => GALLERY_ORDER,
  });
  return rows.map(toRecord);
}

/** Every Media currently set as someone's avatar in this family — see getMediaForFamily's doc comment for why this must be excluded from gallery/album queries. */
function avatarMediaIdsSubquery(familyId: string) {
  return db
    .select({ id: persons.photoMediaId })
    .from(persons)
    .where(
      and(eq(persons.familyId, familyId), isNotNull(persons.photoMediaId)),
    );
}

/**
 * All photo Media belonging to one Album, in gallery order (see
 * GALLERY_ORDER) — the raw material for /families/[slug]/photos/[albumId].
 * Same avatar-exclusion defense as
 * getMediaForFamily, even though the upload panel never offers albumIds for
 * an avatar upload — an avatar should never be addable to an album at all.
 */
export async function getMediaForAlbum(
  albumId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  const rows = await db
    .select({ media })
    .from(mediaAlbum)
    .innerJoin(media, eq(mediaAlbum.mediaId, media.id))
    .where(
      and(
        eq(mediaAlbum.albumId, albumId),
        eq(media.familyId, familyId),
        notInArray(media.id, avatarMediaIdsSubquery(familyId)),
      ),
    )
    .orderBy(...GALLERY_ORDER);

  return rows.map((r) => toRecord(r.media));
}

/**
 * Batch-fetches the people tagged on a set of Media, grouped by mediaId —
 * one query for the whole gallery grid/lightbox instead of N+1 per photo.
 * family_id is checked on the persons side of the join (same IDOR-safe
 * pattern as every other cross-table lookup) since media_person itself
 * carries no family_id column.
 */
export async function getPeopleForMedia(
  mediaIds: string[],
  familyId: string,
): Promise<Map<string, MediaTaggedPerson[]>> {
  const result = new Map<string, MediaTaggedPerson[]>();
  if (mediaIds.length === 0) return result;

  const rows = await db
    .select({
      mediaId: mediaPerson.mediaId,
      person: persons,
      xPercent: mediaPerson.xPercent,
      yPercent: mediaPerson.yPercent,
    })
    .from(mediaPerson)
    .innerJoin(persons, eq(mediaPerson.personId, persons.id))
    .where(
      and(
        inArray(mediaPerson.mediaId, mediaIds),
        eq(persons.familyId, familyId),
      ),
    );

  for (const row of rows) {
    const tagged: MediaTaggedPerson = {
      id: row.person.id,
      slug: row.person.slug,
      firstName: row.person.firstName,
      lastName: row.person.lastName,
      nickname: row.person.nickname,
      isPlaceholder: row.person.isPlaceholder,
      photoMediaId: row.person.photoMediaId,
      xPercent: row.xPercent === null ? null : Number(row.xPercent),
      yPercent: row.yPercent === null ? null : Number(row.yPercent),
    };
    const existing = result.get(row.mediaId);
    if (existing) existing.push(tagged);
    else result.set(row.mediaId, [tagged]);
  }

  return result;
}

/**
 * Batch-fetches the albums a set of Media belongs to, grouped by mediaId —
 * same N+1-avoiding shape as getPeopleForMedia. family_id is checked on the
 * albums side of the join since media_album itself carries no family_id.
 */
export async function getAlbumsForMedia(
  mediaIds: string[],
  familyId: string,
): Promise<Map<string, MediaTaggedAlbum[]>> {
  const result = new Map<string, MediaTaggedAlbum[]>();
  if (mediaIds.length === 0) return result;

  const rows = await db
    .select({ mediaId: mediaAlbum.mediaId, album: albums })
    .from(mediaAlbum)
    .innerJoin(albums, eq(mediaAlbum.albumId, albums.id))
    .where(
      and(inArray(mediaAlbum.mediaId, mediaIds), eq(albums.familyId, familyId)),
    );

  for (const row of rows) {
    const tagged: MediaTaggedAlbum = { id: row.album.id, name: row.album.name };
    const existing = result.get(row.mediaId);
    if (existing) existing.push(tagged);
    else result.set(row.mediaId, [tagged]);
  }

  return result;
}

/** Photos still without downscaled copies — for the one-off backfill (db/backfill-photo-variants.ts). */
export async function getPhotosWithoutVariants(
  familyId?: string,
): Promise<MediaRecord[]> {
  const rows = await db
    .select()
    .from(media)
    .where(
      and(
        eq(media.kind, "photo"),
        isNull(media.variants),
        familyId ? eq(media.familyId, familyId) : undefined,
      ),
    )
    .orderBy(media.createdAt);
  return rows.map(toRecord);
}

export async function setMediaVariants(
  mediaId: string,
  familyId: string,
  data: { variants: MediaVariants; width: number; height: number },
): Promise<boolean> {
  const rows = await db
    .update(media)
    .set(data)
    .where(and(eq(media.id, mediaId), eq(media.familyId, familyId)))
    .returning({ id: media.id });
  return rows.length > 0;
}

/**
 * Every stored file any Media row points at — originals and variants, all
 * families. Only for the orphaned-upload cleanup (media-cleanup.ts), a
 * maintenance job with no acting user, never a request path.
 */
export async function getAllReferencedStorageKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ storageKey: media.storageKey, variants: media.variants })
    .from(media);
  const keys = new Set<string>();
  for (const row of rows) {
    keys.add(row.storageKey);
    for (const variant of Object.values(row.variants ?? {})) {
      keys.add(variant.storageKey);
    }
  }
  return keys;
}

/** Whether a Media row in this family already points at this stored file. */
export async function isStorageKeyUsed(
  storageKey: string,
  familyId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.storageKey, storageKey), eq(media.familyId, familyId)))
    .limit(1);
  return Boolean(row);
}

export interface CreateMediaData {
  familyId: string;
  kind: MediaRecord["kind"];
  storageKey: string;
  storageProvider: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  title?: string | null;
  description?: string | null;
  variants?: MediaVariants | null;
  uploadedBy: string;
  privacyLevel?: PrivacyLevel;
  /** Person ids to link this Media to, created atomically with the row. */
  personIds: string[];
  /** Album ids to link this Media to, created atomically with the row. */
  albumIds: string[];
}

export async function createMedia(
  data: CreateMediaData,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(media)
    .values({
      familyId: data.familyId,
      kind: data.kind,
      storageKey: data.storageKey,
      storageProvider: data.storageProvider,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      width: data.width ?? null,
      height: data.height ?? null,
      title: data.title ?? null,
      description: data.description ?? null,
      variants: data.variants ?? null,
      uploadedBy: data.uploadedBy,
      privacyLevel: data.privacyLevel ?? "family",
      // One higher than this family's current max — a fresh upload always
      // sorts above every previously (manually or implicitly) ordered
      // photo, matching the old createdAt-DESC "newest on top" behavior
      // even after some photos have been hand-reordered. Computed as a
      // subquery in the same INSERT rather than read-then-write to avoid a
      // race between two concurrent uploads picking the same next value.
      sortOrder: sql<number>`coalesce((select max(${media.sortOrder}) from ${media} where ${media.familyId} = ${data.familyId}), 0) + 1`,
    })
    .returning({ id: media.id });

  if (data.personIds.length > 0) {
    await db
      .insert(mediaPerson)
      .values(
        data.personIds.map((personId) => ({ mediaId: row.id, personId })),
      );
  }

  if (data.albumIds.length > 0) {
    await db
      .insert(mediaAlbum)
      .values(data.albumIds.map((albumId) => ({ mediaId: row.id, albumId })));
  }

  return row;
}

export async function deleteMediaRow(
  mediaId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.familyId, familyId)))
    .returning({ id: media.id });
  return result.length > 0;
}

/**
 * Whether a Media row is part of the archive anywhere — tagged on a person,
 * in an album, or attached to a story/event/place. A portrait that is NOT
 * (an avatar uploaded before avatars joined the gallery) would be invisible
 * once replaced, so only those are deleted along with it.
 */
export async function isMediaLinked(
  mediaId: string,
  familyId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        eq(media.id, mediaId),
        eq(media.familyId, familyId),
        sql`(exists (select 1 from ${mediaPerson} where ${mediaPerson.mediaId} = ${media.id})
          or exists (select 1 from ${mediaAlbum} where ${mediaAlbum.mediaId} = ${media.id})
          or exists (select 1 from ${mediaStory} where ${mediaStory.mediaId} = ${media.id})
          or exists (select 1 from ${mediaEvent} where ${mediaEvent.mediaId} = ${media.id})
          or exists (select 1 from ${mediaPlace} where ${mediaPlace.mediaId} = ${media.id}))`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export interface UpsertPhotoTagPositionData {
  mediaId: string;
  personId: string;
  familyId: string;
  xPercent: number;
  yPercent: number;
}

/**
 * Places (or moves) a tap-to-tag point for `personId` on `mediaId`. Upserts
 * on the existing media_person_unique(mediaId, personId) index rather than
 * insert-or-fail: if this person is already tagged untagged-style (a row
 * with null x/y from the bulk-tag-at-upload flow), placing a point tag fills
 * in that SAME row's coordinates instead of violating the unique index.
 * mediaId/personId are validated against familyId in the same statement so a
 * cross-family id never silently succeeds.
 */
export async function upsertPhotoTagPosition(
  data: UpsertPhotoTagPositionData,
): Promise<boolean> {
  const [mediaRow] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.id, data.mediaId), eq(media.familyId, data.familyId)));
  const [personRow] = await db
    .select({ id: persons.id })
    .from(persons)
    .where(
      and(eq(persons.id, data.personId), eq(persons.familyId, data.familyId)),
    );
  if (!mediaRow || !personRow) return false;

  await db
    .insert(mediaPerson)
    .values({
      mediaId: data.mediaId,
      personId: data.personId,
      xPercent: String(data.xPercent),
      yPercent: String(data.yPercent),
    })
    .onConflictDoUpdate({
      target: [mediaPerson.mediaId, mediaPerson.personId],
      set: { xPercent: String(data.xPercent), yPercent: String(data.yPercent) },
    });
  return true;
}

/**
 * "Снять точку" — clears a point-tag back to positionless without removing
 * the mediaPerson row, so the person stays in the photo's "who's tagged"
 * chip list. Distinct from removePersonFromMedia below, which deletes the
 * row entirely ("Убрать из фото").
 */
export async function clearPhotoTagPosition(
  mediaId: string,
  personId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .update(mediaPerson)
    .set({ xPercent: null, yPercent: null })
    .where(
      and(
        eq(mediaPerson.mediaId, mediaId),
        eq(mediaPerson.personId, personId),
        inArray(
          mediaPerson.personId,
          db
            .select({ id: persons.id })
            .from(persons)
            .where(eq(persons.familyId, familyId)),
        ),
      ),
    )
    .returning({ id: mediaPerson.id });
  return result.length > 0;
}

/** "Убрать из фото" — removes the person from this photo entirely (deletes the media_person row). */
export async function removePersonFromMedia(
  mediaId: string,
  personId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .delete(mediaPerson)
    .where(
      and(
        eq(mediaPerson.mediaId, mediaId),
        eq(mediaPerson.personId, personId),
        inArray(
          mediaPerson.personId,
          db
            .select({ id: persons.id })
            .from(persons)
            .where(eq(persons.familyId, familyId)),
        ),
      ),
    )
    .returning({ id: mediaPerson.id });
  return result.length > 0;
}

/**
 * Persists a drag-reordered gallery — `orderedMediaIds[0]` becomes the
 * top/first photo. Assigns strictly decreasing sortOrder values counting
 * down from `orderedMediaIds.length` so the whole reordered set sorts above
 * every not-included row (which stays at its old, possibly lower or NULL,
 * value) — consistent with createMedia's "new upload always on top" contract
 * without needing to know the family's current max here too.
 *
 * A single `CASE id WHEN ... THEN ...` UPDATE, not one statement per photo —
 * scoped to familyId in the same WHERE so an id from another family (or a
 * stale id no longer in this family) is silently dropped rather than
 * corrupting another family's ordering.
 */
export async function reorderMedia(
  orderedMediaIds: string[],
  familyId: string,
): Promise<void> {
  if (orderedMediaIds.length === 0) return;

  const total = orderedMediaIds.length;
  // Explicit ::uuid/::integer casts — without them Postgres can't infer a
  // type for a bare $n parameter inside CASE...WHEN...THEN and the whole
  // UPDATE fails at query time ("failed query", no type info to fall back
  // on), unlike `eq()`/`inArray()` elsewhere which get their param's type
  // from the column they're compared against for free.
  const cases = orderedMediaIds
    .map((id, index) => sql`WHEN ${id}::uuid THEN ${total - index}::integer`)
    .reduce((acc, clause) => sql`${acc} ${clause}`);

  await db
    .update(media)
    .set({ sortOrder: sql`CASE ${media.id} ${cases} END` })
    .where(
      and(eq(media.familyId, familyId), inArray(media.id, orderedMediaIds)),
    );
}
