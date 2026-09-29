import {
  canCreate,
  canDelete,
  type ActingMember,
} from "@/domain/family/permissions";
import {
  deleteAudioMedia,
  discardUploadedFile,
  mediaStorageProvider,
  verifyAudioUpload,
} from "@/domain/media/media.service";
import { UploadRejectedError } from "@/domain/media/upload-rules";
import { getVisiblePerson } from "@/domain/person/person.service";
import type { PartialDate } from "@/domain/shared/partial-date";
import {
  getVoiceById,
  insertVoiceWithMedia,
  listVoicesByPerson,
  moveVoiceToFront,
  type PersonVoiceRecord,
} from "./person-voice.repository";
import {
  isValidVoiceDuration,
  parseVoiceDetails,
  parseVoicePeaks,
} from "./voice-input";

/** What the profile needs to show and play a recording. */
export type PersonVoiceView = Omit<PersonVoiceRecord, "storageKey">;

/** Message is an `errors.*` code. */
export class VoiceRejectedError extends Error {}

/** A person's recordings, main one first — for a person the caller has
 *  already checked the viewer may see (getVisiblePerson): who may hear a
 *  recording follows its person. */
export async function getPersonVoices(
  personId: string,
  familyId: string,
): Promise<PersonVoiceView[]> {
  const records = await listVoicesByPerson(personId, familyId);
  return records.map(({ storageKey: _key, ...view }) => {
    void _key;
    return view;
  });
}

/**
 * Keeps a voice on a person's profile (the browser has already put the
 * audio into storage, lib/direct-upload.ts): whoever may add media may add
 * one, to any person they can see. The file is checked like every upload,
 * then one statement stores the audio and links it to the person. Anything
 * rejected deletes the uploaded file, so nothing half-kept is left behind.
 */
export async function addPersonVoice(input: {
  familyId: string;
  personId: string;
  member: ActingMember;
  storageKey: string;
  durationMs: number;
  peaks: unknown;
  speaker: unknown;
  narratorName: unknown;
  title: unknown;
  recordedDate: PartialDate | null | undefined;
}): Promise<{ id: string }> {
  const { familyId, personId, member, storageKey } = input;
  try {
    const person = await getVisiblePerson(personId, familyId, member);
    if (!person || !canCreate(member.role, "media")) {
      throw new VoiceRejectedError("noMediaPermission");
    }
    const durationMs = Math.round(input.durationMs);
    if (!isValidVoiceDuration(durationMs)) {
      throw new VoiceRejectedError("invalidRecording");
    }
    const details = parseVoiceDetails(input, new Date());
    if (typeof details === "string") throw new VoiceRejectedError(details);

    const info = await verifyAudioUpload(storageKey, familyId);
    const id = await insertVoiceWithMedia({
      familyId,
      personId,
      addedBy: member.userId,
      storageKey,
      storageProvider: mediaStorageProvider,
      mimeType: info.contentType,
      sizeBytes: info.sizeBytes,
      durationMs,
      peaks: parseVoicePeaks(input.peaks),
      ...details,
    });
    return { id };
  } catch (error) {
    // verifyAudioUpload already deleted a file it rejected.
    if (!(error instanceof UploadRejectedError)) {
      await discardUploadedFile(storageKey);
    }
    throw error;
  }
}

/** A recording the member may change: they see its person and, unless an
 *  editor, added it themselves. */
async function editableVoice(
  voiceId: string,
  familyId: string,
  member: ActingMember,
): Promise<PersonVoiceRecord> {
  const voice = await getVoiceById(voiceId, familyId);
  const person =
    voice && (await getVisiblePerson(voice.personId, familyId, member));
  if (
    !voice ||
    !person ||
    !canDelete(member, {
      privacyLevel: "family",
      createdBy: voice.addedBy ?? "",
    })
  ) {
    throw new VoiceRejectedError("voiceNotFound");
  }
  return voice;
}

/** Deletes a recording — its audio and file. Returns its person's id. */
export async function removePersonVoice(input: {
  familyId: string;
  voiceId: string;
  member: ActingMember;
}): Promise<{ personId: string }> {
  const voice = await editableVoice(
    input.voiceId,
    input.familyId,
    input.member,
  );
  await deleteAudioMedia(voice.mediaId, input.familyId);
  return { personId: voice.personId };
}

/** Makes a recording the one the profile hero plays. Editors only: it
 *  reorders everyone's recordings, not just the member's own. */
export async function featurePersonVoice(input: {
  familyId: string;
  voiceId: string;
  member: ActingMember;
}): Promise<{ personId: string }> {
  if (input.member.role !== "owner" && input.member.role !== "editor") {
    throw new VoiceRejectedError("voiceNotFound");
  }
  const voice = await editableVoice(
    input.voiceId,
    input.familyId,
    input.member,
  );
  await moveVoiceToFront(voice.id, voice.personId, input.familyId);
  return { personId: voice.personId };
}
