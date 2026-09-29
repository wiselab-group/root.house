"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getErrorMessage } from "@/i18n/errors";
import { UploadRejectedError } from "@/domain/media/upload-rules";
import { partialDateFromFormData } from "@/domain/shared/partial-date";
import {
  addPersonVoice,
  featurePersonVoice,
  removePersonVoice,
  VoiceRejectedError,
} from "@/domain/person-voice/person-voice.service";

type Result = { ok: true } | { error: string };

async function translate(error: unknown): Promise<Result> {
  const message = await getErrorMessage();
  if (error instanceof UploadRejectedError) {
    return { error: message(error.message, error.values) };
  }
  if (error instanceof VoiceRejectedError) {
    return { error: message(error.message) };
  }
  throw error;
}

/**
 * Step 2 of adding a voice to a profile (AddVoiceDialog): the audio is
 * already in private storage (lib/direct-upload.ts, kind "audio"); this
 * keeps it as the person's recording, with the dialog's details (speaker,
 * narrator, title, recorded date — `recorded*` PersonDateFields). Who may
 * do it and what's valid is decided by addPersonVoice — this only
 * establishes who is asking.
 */
export async function addPersonVoiceAction(
  familyId: string,
  profilePath: string,
  input: {
    personId: string;
    storageKey: string;
    durationMs: number;
    peaks: number[] | null;
  },
  details: FormData,
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
    await addPersonVoice({
      familyId,
      personId: input.personId,
      member: { userId: session.user.id, role: member.role },
      storageKey: input.storageKey,
      durationMs: input.durationMs,
      peaks: input.peaks,
      speaker: details.get("speaker"),
      narratorName: details.get("narratorName"),
      title: details.get("title"),
      recordedDate: partialDateFromFormData(details, "recorded"),
    });
  } catch (error) {
    return translate(error);
  }
  revalidatePath(profilePath);
  return { ok: true };
}

export async function removePersonVoiceAction(
  familyId: string,
  profilePath: string,
  voiceId: string,
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
    await removePersonVoice({
      familyId,
      voiceId,
      member: { userId: session.user.id, role: member.role },
    });
  } catch (error) {
    return translate(error);
  }
  revalidatePath(profilePath);
  return { ok: true };
}

/** «Сделать главной» — the recording the profile hero plays. */
export async function featurePersonVoiceAction(
  familyId: string,
  profilePath: string,
  voiceId: string,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) {
    return { error: (await getErrorMessage())("sessionExpired") };
  }
  const member = await requireFamilyAccess(familyId, session.user.id, "editor");
  try {
    await featurePersonVoice({
      familyId,
      voiceId,
      member: { userId: session.user.id, role: member.role },
    });
  } catch (error) {
    return translate(error);
  }
  revalidatePath(profilePath);
  return { ok: true };
}
