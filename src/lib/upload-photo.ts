import { recordUpload, uploadToStorage } from "./direct-upload";

/**
 * Uploads one photo, used by every photo picker (the gallery batch upload,
 * AvatarEditor, the new-person form): straight into Blob storage (see
 * lib/direct-upload.ts), then /api/media/upload records it (tags, albums,
 * portrait) and makes its downscaled copies in the background.
 *
 * Progress: the real upload fraction is scaled into 0–90%, the last 10% is
 * recording the photo — so the bar never sits at a fake 100% while the
 * server is still working.
 */
const UPLOAD_PHASE_CEILING = 0.9;
const GENERIC_ERROR = "Не удалось загрузить фото";

export async function uploadPhoto({
  familyId,
  personIds = [],
  albumIds = [],
  personId,
  isAvatar = false,
  file,
  privacyLevel,
  onProgress,
}: {
  familyId: string;
  personIds?: string[];
  albumIds?: string[];
  /** The person whose portrait this becomes — required with isAvatar. */
  personId?: string;
  isAvatar?: boolean;
  file: File;
  privacyLevel?: "private" | "family" | "public";
  onProgress?: (fraction: number) => void;
}): Promise<{ id: string }> {
  const storageKey = await uploadToStorage({
    familyId,
    kind: "photo",
    isAvatar,
    file,
    onProgress: (fraction) => onProgress?.(fraction * UPLOAD_PHASE_CEILING),
  }).catch((error: unknown) => {
    throw error instanceof Error && error.message.startsWith("Файл")
      ? error
      : new Error(GENERIC_ERROR);
  });

  const result = await recordUpload(
    "/api/media/upload",
    {
      familyId,
      storageKey,
      personIds,
      albumIds,
      personId,
      isAvatar,
      privacyLevel,
    },
    GENERIC_ERROR,
  );
  onProgress?.(1);
  return result;
}
