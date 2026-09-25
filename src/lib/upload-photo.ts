import { upload } from "@vercel/blob/client";
import {
  PHOTO_MAX_BYTES,
  photoUploadPathname,
} from "@/domain/media/photo-upload-rules";

/**
 * Uploads one photo in two steps, used by every photo picker (the gallery
 * batch upload, AvatarEditor, the new-person form):
 *
 * 1. the file goes from the browser straight into private Blob storage,
 *    with a token from /api/media/upload-token — never through our own
 *    functions, whose request body Vercel caps at ~4.5MB;
 * 2. /api/media/upload records it (tags, albums, portrait) and makes its
 *    downscaled copies.
 *
 * Progress: the real upload fraction is scaled into 0–90%, the last 10% is
 * step 2 (making the copies takes a moment) — so the bar never sits at a
 * fake 100% while the server is still working.
 */
const UPLOAD_PHASE_CEILING = 0.9;
/** Above this, Blob splits the upload into parallel, retried parts. */
const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
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
  if (file.size > PHOTO_MAX_BYTES) throw new Error("Файл больше 25 МБ");

  let storageKey: string;
  try {
    const blob = await upload(photoUploadPathname(familyId, file.name), file, {
      access: "private",
      handleUploadUrl: "/api/media/upload-token",
      clientPayload: JSON.stringify({ familyId, isAvatar }),
      // Empty for HEIC outside Safari — Blob then infers it from the extension.
      contentType: file.type || undefined,
      multipart: file.size > MULTIPART_THRESHOLD,
      onUploadProgress: ({ loaded, total }) => {
        if (total > 0) onProgress?.((loaded / total) * UPLOAD_PHASE_CEILING);
      },
    });
    storageKey = blob.pathname;
  } catch {
    throw new Error(GENERIC_ERROR);
  }

  const response = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      familyId,
      storageKey,
      personIds,
      albumIds,
      personId,
      isAvatar,
      privacyLevel,
    }),
  });
  const body: { id?: string; error?: string } = await response
    .json()
    .catch(() => ({}));
  if (!response.ok || !body.id) throw new Error(body.error ?? GENERIC_ERROR);

  onProgress?.(1);
  return { id: body.id };
}
