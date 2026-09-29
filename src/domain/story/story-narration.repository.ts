import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { media, storyNarration, users, type NarrationCue } from "@/db/schema";

export interface StoryNarrationRecord {
  mediaId: string;
  storageKey: string;
  cues: NarrationCue[];
  durationMs: number;
  bodyHash: string;
  recordedByName: string | null;
}

/** A story's recording, if it has one — family-scoped in the same query. */
export async function getNarrationByStory(
  storyId: string,
  familyId: string,
): Promise<StoryNarrationRecord | null> {
  const [row] = await db
    .select({
      mediaId: storyNarration.mediaId,
      storageKey: media.storageKey,
      cues: storyNarration.cues,
      durationMs: storyNarration.durationMs,
      bodyHash: storyNarration.bodyHash,
      recordedByName: users.name,
    })
    .from(storyNarration)
    .innerJoin(media, eq(media.id, storyNarration.mediaId))
    .leftJoin(users, eq(users.id, storyNarration.recordedBy))
    .where(
      and(
        eq(storyNarration.storyId, storyId),
        eq(storyNarration.familyId, familyId),
        eq(media.familyId, familyId),
        eq(media.kind, "audio"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** The story a recording belongs to — for deciding who may hear it. */
export async function getNarrationStoryId(
  mediaId: string,
  familyId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ storyId: storyNarration.storyId })
    .from(storyNarration)
    .where(
      and(
        eq(storyNarration.mediaId, mediaId),
        eq(storyNarration.familyId, familyId),
      ),
    )
    .limit(1);
  return row?.storyId ?? null;
}

export interface CreateNarrationData {
  familyId: string;
  storyId: string;
  recordedBy: string;
  storageKey: string;
  storageProvider: string;
  mimeType: string;
  sizeBytes: number;
  cues: NarrationCue[];
  durationMs: number;
  bodyHash: string;
}

/**
 * Records the audio and links it to its story in ONE statement (neon-http
 * has no transactions — CLAUDE.md FORBIDDEN): the media row of kind
 * "audio" and the story_narration row replacing any earlier one. Returns
 * the new media id. No sort order, people or albums — a recording is
 * nowhere in the photo archive.
 */
export async function insertNarrationWithMedia(
  data: CreateNarrationData,
): Promise<string> {
  const result = await db.execute<{ media_id: string }>(sql`
    WITH new_media AS (
      INSERT INTO media (family_id, kind, storage_key, storage_provider,
        mime_type, size_bytes, duration_seconds, uploaded_by, privacy_level)
      VALUES (${data.familyId}, 'audio', ${data.storageKey},
        ${data.storageProvider}, ${data.mimeType}, ${data.sizeBytes},
        ${Math.round(data.durationMs / 1000)}, ${data.recordedBy}, 'family')
      RETURNING id
    )
    INSERT INTO story_narration (family_id, story_id, media_id, recorded_by,
      cues, duration_ms, body_hash)
    SELECT ${data.familyId}, ${data.storyId}, new_media.id, ${data.recordedBy},
      ${JSON.stringify(data.cues)}::jsonb, ${data.durationMs}, ${data.bodyHash}
    FROM new_media
    ON CONFLICT (story_id) DO UPDATE SET
      media_id = EXCLUDED.media_id,
      recorded_by = EXCLUDED.recorded_by,
      cues = EXCLUDED.cues,
      duration_ms = EXCLUDED.duration_ms,
      body_hash = EXCLUDED.body_hash,
      created_at = now()
    RETURNING media_id
  `);
  return result.rows[0].media_id;
}
