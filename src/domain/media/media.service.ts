import { vercelBlobStorageService } from "./storage.vercel-blob";
import {
  createMedia,
  deleteMediaRow,
  getMediaById,
  getMediaForPerson,
  type CreateMediaData,
  type MediaRecord,
} from "./media.repository";

export type { MediaRecord };

const storage = vercelBlobStorageService;

export interface UploadPhotoInput {
  familyId: string;
  personId: string;
  uploadedBy: string;
  file: Buffer;
  contentType: string;
  originalFilename: string;
  width?: number;
  height?: number;
}

/**
 * Uploads a photo to storage and records it as Media linked to `personId`,
 * in that order — if the DB insert fails after a successful upload, the
 * orphaned blob is deleted so storage doesn't silently accumulate unlinked
 * files (there is no multi-statement DB transaction spanning an external
 * HTTP call to storage, so this is a best-effort compensating action, not a
 * true atomic guarantee).
 */
export async function uploadPersonPhoto(
  input: UploadPhotoInput,
): Promise<{ id: string }> {
  const key = `${input.familyId}/${crypto.randomUUID()}-${sanitizeFilename(input.originalFilename)}`;

  const { storageKey } = await storage.upload({
    key,
    file: input.file,
    contentType: input.contentType,
  });

  try {
    return await createMedia({
      familyId: input.familyId,
      kind: "photo",
      storageKey,
      storageProvider: storage.providerName,
      mimeType: input.contentType,
      sizeBytes: input.file.byteLength,
      width: input.width,
      height: input.height,
      uploadedBy: input.uploadedBy,
      personIds: [input.personId],
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => {
      // Best-effort cleanup — the DB insert error is what actually matters to the caller.
    });
    throw error;
  }
}

/**
 * Uploads a Person's avatar as its own Media row, deliberately NOT linked
 * via media_person — an avatar is a distinct thing from the photo gallery
 * (see person.service.ts::setPersonAvatar), not "pick one of your uploaded
 * photos", so it must never appear in getMediaForPerson/the gallery grid.
 */
export async function uploadPersonAvatar(
  input: Omit<UploadPhotoInput, "personId"> & { personId: string },
): Promise<{ id: string }> {
  const key = `${input.familyId}/avatar-${crypto.randomUUID()}-${sanitizeFilename(input.originalFilename)}`;

  const { storageKey } = await storage.upload({
    key,
    file: input.file,
    contentType: input.contentType,
  });

  try {
    return await createMedia({
      familyId: input.familyId,
      kind: "photo",
      storageKey,
      storageProvider: storage.providerName,
      mimeType: input.contentType,
      sizeBytes: input.file.byteLength,
      width: input.width,
      height: input.height,
      uploadedBy: input.uploadedBy,
      personIds: [], // not linked to the gallery — see doc comment above
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => {
      // Best-effort cleanup — the DB insert error is what actually matters to the caller.
    });
    throw error;
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function getPersonGallery(
  personId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  return getMediaForPerson(personId, familyId);
}

export async function getMedia(
  mediaId: string,
  familyId: string,
): Promise<MediaRecord | null> {
  return getMediaById(mediaId, familyId);
}

export async function getMediaStream(mediaId: string, familyId: string) {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return null;
  const result = await storage.getStream(record.storageKey);
  if (!result) return null;
  return { stream: result.stream, contentType: result.contentType ?? record.mimeType };
}

export async function removeMedia(
  mediaId: string,
  familyId: string,
): Promise<boolean> {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return false;

  // Best-effort: the blob may already be gone (e.g. a dev-vs-prod store
  // mismatch, see docs/architecture.md) — that's not a reason to fail the
  // whole operation and leave the Media row (and, when called while
  // replacing an avatar, the newly-uploaded photo) orphaned.
  await storage.delete(record.storageKey).catch(() => {});
  return deleteMediaRow(mediaId, familyId);
}

export type { CreateMediaData };
