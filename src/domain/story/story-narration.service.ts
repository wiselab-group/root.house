import type { ActingMember } from "@/domain/family/permissions";
import {
  deleteNarrationAudio,
  discardUploadedFile,
  mediaStorageProvider,
  verifyNarrationUpload,
} from "@/domain/media/media.service";
import { UploadRejectedError } from "@/domain/media/upload-rules";
import { canEditStory, getStory } from "./story.service";
import {
  getNarrationByStory,
  insertNarrationWithMedia,
} from "./story-narration.repository";
import {
  MAX_NARRATION_MS,
  parseNarrationCues,
  storyTextHash,
} from "./narration-cues";

/** What the story page needs to play a recording. */
export interface StoryNarrationView {
  mediaId: string;
  cues: { block: string; ms: number }[];
  durationMs: number;
  recordedByName: string | null;
  /** The story text changed after it was recorded. */
  stale: boolean;
}

/** The recording of a story the caller has already checked `member` may
 *  read (getVisibleStory) — or null when there's none. */
export async function getStoryNarration(
  story: { id: string; title: string; body: string },
  familyId: string,
): Promise<StoryNarrationView | null> {
  const record = await getNarrationByStory(story.id, familyId);
  if (!record) return null;
  return {
    mediaId: record.mediaId,
    cues: record.cues,
    durationMs: record.durationMs,
    recordedByName: record.recordedByName,
    stale: record.bodyHash !== storyTextHash(story.title, story.body),
  };
}

export class NarrationRejectedError extends Error {}

/**
 * Keeps a family member's reading of a story (the browser has already put
 * the audio into storage, lib/direct-upload.ts): whoever may edit the story
 * may record it. The file is checked like every upload; the cues must fit
 * the recording. One statement stores the audio and links it to the story;
 * an earlier recording is then deleted. Anything rejected deletes the
 * uploaded file, so nothing half-kept is left behind.
 */
export async function saveStoryNarration(input: {
  familyId: string;
  storyId: string;
  member: ActingMember;
  storageKey: string;
  durationMs: number;
  cues: unknown;
}): Promise<{ mediaId: string }> {
  const { familyId, storyId, member, storageKey } = input;
  try {
    const story = await getStory(storyId, familyId);
    if (
      !story ||
      story.status !== "published" ||
      !canEditStory(member, story)
    ) {
      throw new NarrationRejectedError("noStoryEdit");
    }
    const durationMs = Math.round(input.durationMs);
    if (!(durationMs > 0 && durationMs <= MAX_NARRATION_MS)) {
      throw new NarrationRejectedError("invalidRecording");
    }
    const cues = parseNarrationCues(input.cues, durationMs);
    if (!cues) throw new NarrationRejectedError("invalidRecording");

    const info = await verifyNarrationUpload(storageKey, familyId);
    const previous = await getNarrationByStory(storyId, familyId);
    const mediaId = await insertNarrationWithMedia({
      familyId,
      storyId,
      recordedBy: member.userId,
      storageKey,
      storageProvider: mediaStorageProvider,
      mimeType: info.contentType,
      sizeBytes: info.sizeBytes,
      cues,
      durationMs,
      bodyHash: storyTextHash(story.title, story.body),
    });
    if (previous && previous.mediaId !== mediaId) {
      await deleteNarrationAudio(previous.mediaId, familyId);
    }
    return { mediaId };
  } catch (error) {
    // verifyNarrationUpload already deleted a file it rejected.
    if (!(error instanceof UploadRejectedError)) {
      await discardUploadedFile(storageKey);
    }
    throw error;
  }
}

/** Deletes a story's recording — back to the device voice. */
export async function removeStoryNarration(input: {
  familyId: string;
  storyId: string;
  member: ActingMember;
}): Promise<void> {
  const story = await getStory(input.storyId, input.familyId);
  if (!story || !canEditStory(input.member, story)) {
    throw new NarrationRejectedError("noStoryEdit");
  }
  const record = await getNarrationByStory(input.storyId, input.familyId);
  if (record) await deleteNarrationAudio(record.mediaId, input.familyId);
}
