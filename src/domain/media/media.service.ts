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
export async function uploadPersonPhoto(input: UploadPhotoInput): Promise<{ id: string }> {
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

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function getPersonGallery(personId: string, familyId: string): Promise<MediaRecord[]> {
  return getMediaForPerson(personId, familyId);
}

export async function getMedia(mediaId: string, familyId: string): Promise<MediaRecord | null> {
  return getMediaById(mediaId, familyId);
}

export async function getMediaStream(mediaId: string, familyId: string) {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return null;
  const { stream, contentType } = await storage.getStream(record.storageKey);
  return { stream, contentType: contentType ?? record.mimeType };
}

export async function removeMedia(mediaId: string, familyId: string): Promise<boolean> {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return false;

  await storage.delete(record.storageKey);
  return deleteMediaRow(mediaId, familyId);
}

export type { CreateMediaData };
