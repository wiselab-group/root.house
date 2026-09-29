import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { media, personVoice } from "@/db/schema";
import {
  fromColumns,
  toColumns,
  type PartialDate,
} from "@/domain/shared/partial-date";
import type { VoiceSpeaker } from "./voice-input";

export interface PersonVoiceRecord {
  id: string;
  personId: string;
  mediaId: string;
  storageKey: string;
  speaker: VoiceSpeaker;
  narratorName: string | null;
  title: string | null;
  recordedDate: PartialDate | null;
  durationMs: number;
  peaks: number[] | null;
  addedBy: string | null;
}

const columns = {
  id: personVoice.id,
  personId: personVoice.personId,
  mediaId: personVoice.mediaId,
  storageKey: media.storageKey,
  speaker: personVoice.speaker,
  narratorName: personVoice.narratorName,
  title: personVoice.title,
  year: personVoice.recordedDateYear,
  month: personVoice.recordedDateMonth,
  day: personVoice.recordedDateDay,
  precision: personVoice.recordedDatePrecision,
  approximate: personVoice.recordedDateApproximate,
  durationMs: personVoice.durationMs,
  peaks: personVoice.peaks,
  addedBy: personVoice.addedBy,
};

const select = () =>
  db
    .select(columns)
    .from(personVoice)
    .innerJoin(media, eq(media.id, personVoice.mediaId));

function toRecord(
  row: Awaited<ReturnType<typeof select>>[number],
): PersonVoiceRecord {
  const { year, month, day, precision, approximate, ...rest } = row;
  return {
    ...rest,
    recordedDate: fromColumns({ year, month, day, precision, approximate }),
  };
}

/** A person's recordings, the profile's main one first — family-scoped in
 *  the same query, audio rows only. */
export async function listVoicesByPerson(
  personId: string,
  familyId: string,
): Promise<PersonVoiceRecord[]> {
  const rows = await select()
    .where(
      and(
        eq(personVoice.personId, personId),
        eq(personVoice.familyId, familyId),
        eq(media.familyId, familyId),
        eq(media.kind, "audio"),
      ),
    )
    .orderBy(asc(personVoice.position), asc(personVoice.createdAt));
  return rows.map(toRecord);
}

export async function getVoiceById(
  voiceId: string,
  familyId: string,
): Promise<PersonVoiceRecord | null> {
  const [row] = await select()
    .where(
      and(
        eq(personVoice.id, voiceId),
        eq(personVoice.familyId, familyId),
        eq(media.familyId, familyId),
      ),
    )
    .limit(1);
  return row ? toRecord(row) : null;
}

/** The person a voice recording belongs to — for deciding who may hear it. */
export async function getVoicePersonId(
  mediaId: string,
  familyId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ personId: personVoice.personId })
    .from(personVoice)
    .where(
      and(eq(personVoice.mediaId, mediaId), eq(personVoice.familyId, familyId)),
    )
    .limit(1);
  return row?.personId ?? null;
}

export interface CreateVoiceData {
  familyId: string;
  personId: string;
  addedBy: string;
  storageKey: string;
  storageProvider: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  speaker: VoiceSpeaker;
  narratorName: string | null;
  title: string | null;
  recordedDate: PartialDate | null;
  peaks: number[] | null;
}

/**
 * Records the audio and links it to its person in ONE statement (neon-http
 * has no transactions — CLAUDE.md FORBIDDEN): the media row of kind
 * "audio" and the person_voice row, placed after the person's existing
 * recordings so the profile's main one stays put. No people tags, albums
 * or sort order — a recording is nowhere in the photo archive.
 */
export async function insertVoiceWithMedia(
  data: CreateVoiceData,
): Promise<string> {
  const date = toColumns(data.recordedDate);
  const result = await db.execute<{ id: string }>(sql`
    WITH new_media AS (
      INSERT INTO media (family_id, kind, storage_key, storage_provider,
        mime_type, size_bytes, duration_seconds, uploaded_by, privacy_level)
      VALUES (${data.familyId}, 'audio', ${data.storageKey},
        ${data.storageProvider}, ${data.mimeType}, ${data.sizeBytes},
        ${Math.round(data.durationMs / 1000)}, ${data.addedBy}, 'family')
      RETURNING id
    )
    INSERT INTO person_voice (family_id, person_id, media_id, speaker,
      narrator_name, title, recorded_date_year, recorded_date_month,
      recorded_date_day, recorded_date_precision, recorded_date_approximate,
      duration_ms, peaks, position, added_by)
    SELECT ${data.familyId}, ${data.personId}, new_media.id, ${data.speaker},
      ${data.narratorName}, ${data.title}, ${date.year}, ${date.month},
      ${date.day}, ${date.precision}, ${date.approximate}, ${data.durationMs},
      ${data.peaks ? JSON.stringify(data.peaks) : null}::jsonb,
      COALESCE((SELECT MAX(position) + 1 FROM person_voice
        WHERE person_id = ${data.personId} AND family_id = ${data.familyId}), 0),
      ${data.addedBy}
    FROM new_media
    RETURNING id
  `);
  return result.rows[0].id;
}

/** Makes a recording the one the profile hero plays: ahead of the rest. */
export async function moveVoiceToFront(
  voiceId: string,
  personId: string,
  familyId: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE person_voice SET position = (
      SELECT COALESCE(MIN(position), 0) - 1 FROM person_voice
      WHERE person_id = ${personId} AND family_id = ${familyId}
    )
    WHERE id = ${voiceId} AND family_id = ${familyId}
  `);
}
