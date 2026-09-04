import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { media, mediaPerson } from "@/db/schema";

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
  privacyLevel: "private" | "family" | "public";
  uploadedBy: string;
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
  /** Person ids to link this Media to, created atomically with the row. */
  personIds: string[];
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
    })
    .returning({ id: media.id });

  if (data.personIds.length > 0) {
    await db
      .insert(mediaPerson)
      .values(
        data.personIds.map((personId) => ({ mediaId: row.id, personId })),
      );
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
