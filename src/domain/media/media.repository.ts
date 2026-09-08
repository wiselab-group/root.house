import { and, desc, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  media,
  mediaPerson,
  mediaAlbum,
  persons,
  albums,
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
  privacyLevel: PrivacyLevel;
  uploadedBy: string;
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
    privacyLevel: row.privacyLevel,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

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

/** All Media linked to a given Person, newest first — the raw material for a Person's photo gallery. */
export async function getMediaForPerson(
  personId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  const rows = await db
    .select({ media })
    .from(mediaPerson)
    .innerJoin(media, eq(mediaPerson.mediaId, media.id))
    .where(
      and(eq(mediaPerson.personId, personId), eq(media.familyId, familyId)),
    )
    .orderBy(media.createdAt);

  return rows.map((r) => toRecord(r.media)).reverse();
}

/**
 * All photo Media belonging to a family, newest first — the raw material
 * for the family-wide gallery (/families/[slug]/photos). Queries `media`
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
    orderBy: (table, { desc: descOrder }) => descOrder(table.createdAt),
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
 * All photo Media belonging to one Album, newest first — the raw material
 * for /families/[slug]/photos/[albumId]. Same avatar-exclusion defense as
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
    .orderBy(desc(media.createdAt));

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
    .select({ mediaId: mediaPerson.mediaId, person: persons })
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
      uploadedBy: data.uploadedBy,
      privacyLevel: data.privacyLevel ?? "family",
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
