import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { albums } from "@/db/schema";

export interface AlbumRecord {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
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
