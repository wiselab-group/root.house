import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { albums, media, mediaAlbum, persons } from "@/db/schema";

export interface AlbumRecord {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
}

/** AlbumRecord plus what an album grid card needs to render a cover — the
 *  family's most recent non-avatar photo in the album, and how many it has. */
export interface AlbumWithCoverRecord extends AlbumRecord {
  photoCount: number;
  coverMediaId: string | null;
}

function toRecord(row: typeof albums.$inferSelect): AlbumRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    description: row.description,
  };
}

/** Fetches an Album scoped to a family in the same query — same IDOR-safe pattern as getPersonById/getPlaceById. */
export async function getAlbumById(
  albumId: string,
  familyId: string,
): Promise<AlbumRecord | null> {
  const row = await db.query.albums.findFirst({
    where: and(eq(albums.id, albumId), eq(albums.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

/** Newest first — album tabs read more naturally with the most recently created album first. */
export async function listAlbumsByFamily(
  familyId: string,
): Promise<AlbumRecord[]> {
  const rows = await db.query.albums.findMany({
    where: eq(albums.familyId, familyId),
    orderBy: [desc(albums.createdAt)],
  });
  return rows.map(toRecord);
}

/**
 * Builds (but doesn't execute) the listAlbumsWithCoverByFamily query —
 * split out so a unit test can call `.toSQL()` on it and assert the
 * generated SQL text is well-formed, without needing a live database
 * connection (neon-http only opens one on actual execution).
 *
 * Every column inside the two correlated subqueries is written as a
 * table-qualified raw identifier (sql.raw on our own schema's fixed
 * table/column names, never user input) rather than interpolating Column
 * objects — interpolating e.g. ${media.id} into a nested sql`` fragment
 * renders as the bare "id" with NO table prefix, which Postgres then
 * rejects as "column reference is ambiguous" the moment media_album and
 * media (both have an `id` column) are joined together in the same
 * subquery. See album.repository.test.ts for the regression coverage.
 */
export function buildAlbumsWithCoverQuery(familyId: string) {
  const avatarMediaIds = db
    .select({ id: persons.photoMediaId })
    .from(persons)
    .where(
      and(eq(persons.familyId, familyId), isNotNull(persons.photoMediaId)),
    );

  const photoCount = sql<number>`(
    select count(*)::int from ${mediaAlbum}
    inner join ${media} on ${sql.raw('"media"."id"')} = ${sql.raw('"media_album"."media_id"')}
    where ${sql.raw('"media_album"."album_id"')} = ${sql.raw('"albums"."id"')}
      and ${sql.raw('"media"."id"')} not in ${avatarMediaIds}
  )`.as("photo_count");

  const coverMediaId = sql<string | null>`(
    select ${sql.raw('"media"."id"')} from ${mediaAlbum}
    inner join ${media} on ${sql.raw('"media"."id"')} = ${sql.raw('"media_album"."media_id"')}
    where ${sql.raw('"media_album"."album_id"')} = ${sql.raw('"albums"."id"')}
      and ${sql.raw('"media"."id"')} not in ${avatarMediaIds}
    order by ${sql.raw('"media"."created_at"')} desc
    limit 1
  )`.as("cover_media_id");

  return db
    .select({
      id: albums.id,
      familyId: albums.familyId,
      name: albums.name,
      description: albums.description,
      photoCount,
      coverMediaId,
    })
    .from(albums)
    .where(eq(albums.familyId, familyId))
    .orderBy(desc(albums.createdAt));
}

/**
 * Same as listAlbumsByFamily, but also annotates each album with a cover
 * photo and photo count for the album grid — same correlated-subquery shape
 * as listFamiliesForUser's personCount, and the same avatar-exclusion as
 * media.repository.ts::getMediaForAlbum (an avatar should never surface as
 * an album cover, since it isn't really "in" the album from the user's
 * point of view even if a row technically links it).
 */
export async function listAlbumsWithCoverByFamily(
  familyId: string,
): Promise<AlbumWithCoverRecord[]> {
  return buildAlbumsWithCoverQuery(familyId);
}

export interface CreateAlbumData {
  familyId: string;
  name: string;
  description?: string | null;
}

export async function createAlbum(
  data: CreateAlbumData,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(albums)
    .values({
      familyId: data.familyId,
      name: data.name,
      description: data.description ?? null,
    })
    .returning({ id: albums.id });
  return row;
}

/**
 * Deletes the Album itself — media_album rows cascade-delete with it, but
 * the Media rows (and their media_person tags) are untouched: removing an
 * album is removing a grouping, never the photos inside it.
 */
export async function deleteAlbum(
  albumId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .delete(albums)
    .where(and(eq(albums.id, albumId), eq(albums.familyId, familyId)))
    .returning({ id: albums.id });
  return result.length > 0;
}

export interface UpdateAlbumData {
  name: string;
  description?: string | null;
}

/** Same IDOR-safe WHERE id AND family_id pattern as deleteAlbum — a foreign albumId updates nothing. */
export async function updateAlbum(
  albumId: string,
  familyId: string,
  data: UpdateAlbumData,
): Promise<boolean> {
  const result = await db
    .update(albums)
    .set({ name: data.name, description: data.description ?? null })
    .where(and(eq(albums.id, albumId), eq(albums.familyId, familyId)))
    .returning({ id: albums.id });
  return result.length > 0;
}
