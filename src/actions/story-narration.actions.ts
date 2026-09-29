"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getErrorMessage } from "@/i18n/errors";
import { UploadRejectedError } from "@/domain/media/upload-rules";
import {
  NarrationRejectedError,
  removeStoryNarration,
  saveStoryNarration,
} from "@/domain/story/story-narration.service";

type Result = { ok: true } | { error: string };

/**
 * Step 2 of recording a story (StoryRecorder): the audio is already in
 * private storage (lib/direct-upload.ts, kind "audio"); this keeps it as
 * the story's recording. Who may do it and what's valid is decided by
 * saveStoryNarration — this only establishes who is asking.
 */
export async function saveStoryNarrationAction(
  familyId: string,
  storyPath: string,
  input: {
    storyId: string;
    storageKey: string;
    durationMs: number;
    cues: unknown;
  },
): Promise<Result> {
  const session = await auth();
  if (!session?.user) {
    return { error: (await getErrorMessage())("sessionExpired") };
  }
  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  try {
    await saveStoryNarration({
      familyId,
      storyId: input.storyId,
      member: { userId: session.user.id, role: member.role },
      storageKey: input.storageKey,
      durationMs: input.durationMs,
      cues: input.cues,
    });
  } catch (error) {
    const message = await getErrorMessage();
    if (error instanceof UploadRejectedError) {
      return { error: message(error.message, error.values) };
    }
    if (error instanceof NarrationRejectedError) {
      return { error: message(error.message) };
    }
    throw error;
  }
  revalidatePath(storyPath);
  return { ok: true };
}

/** Deletes a story's recording; the story goes back to the device voice. */
export async function removeStoryNarrationAction(
  familyId: string,
  storyPath: string,
  storyId: string,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) {
    return { error: (await getErrorMessage())("sessionExpired") };
  }
  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  try {
    await removeStoryNarration({
      familyId,
      storyId,
      member: { userId: session.user.id, role: member.role },
    });
  } catch (error) {
    if (error instanceof NarrationRejectedError) {
      return { error: (await getErrorMessage())(error.message) };
    }
    throw error;
  }
  revalidatePath(storyPath);
  return { ok: true };
}
