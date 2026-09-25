import { recordUpload, uploadToStorage } from "./direct-upload";

/**
 * Uploads one document for a person's profile: straight into Blob storage
 * (see lib/direct-upload.ts), then /api/media/upload-document records it.
 * Same progress split as lib/upload-photo.ts — 0–90% is the bytes being
 * sent, the rest is recording it.
 */
const UPLOAD_PHASE_CEILING = 0.9;
const GENERIC_ERROR = "Не удалось загрузить документ";

export async function uploadDocument({
  familyId,
  personId,
  file,
  privacyLevel,
  onProgress,
}: {
  familyId: string;
  personId: string;
  file: File;
  privacyLevel?: "private" | "family" | "public";
  onProgress?: (fraction: number) => void;
}): Promise<{ id: string }> {
  const storageKey = await uploadToStorage({
    familyId,
    kind: "document",
    file,
    onProgress: (fraction) => onProgress?.(fraction * UPLOAD_PHASE_CEILING),
  }).catch((error: unknown) => {
    throw error instanceof Error && error.message.startsWith("Файл")
      ? error
      : new Error(GENERIC_ERROR);
  });

  const result = await recordUpload(
    "/api/media/upload-document",
    { familyId, personId, storageKey, filename: file.name, privacyLevel },
    GENERIC_ERROR,
  );
  onProgress?.(1);
  return result;
}
