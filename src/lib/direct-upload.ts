import { upload } from "@vercel/blob/client";
import {
  UPLOAD_RULES,
  uploadPathname,
  type UploadKind,
} from "@/domain/media/upload-rules";

/**
 * Step 1 of every upload (photos: lib/upload-photo.ts, documents:
 * lib/upload-document.ts): the file goes from the browser straight into
 * private Blob storage, with a token from /api/media/upload-token — never
 * through our own functions, whose request body Vercel caps at ~4.5MB.
 * Returns where it landed; step 2 is the caller's own "record it" route.
 *
 * `onProgress` gets the real fraction of bytes sent, 0–1.
 */
const MULTIPART_THRESHOLD = 8 * 1024 * 1024;

export async function uploadToStorage({
  familyId,
  kind,
  isAvatar = false,
  file,
  onProgress,
}: {
  familyId: string;
  kind: UploadKind;
  isAvatar?: boolean;
  file: File;
  onProgress?: (fraction: number) => void;
}): Promise<string> {
  const { maxBytes } = UPLOAD_RULES[kind];
  if (file.size > maxBytes) {
    throw new Error(`Файл больше ${Math.round(maxBytes / 1024 ** 2)} МБ`);
  }

  const blob = await upload(uploadPathname(familyId, file.name), file, {
    access: "private",
    handleUploadUrl: "/api/media/upload-token",
    clientPayload: JSON.stringify({ familyId, kind, isAvatar }),
    // Empty for HEIC outside Safari — Blob then infers it from the extension.
    contentType: file.type || undefined,
    // Above this, Blob splits the upload into parallel, retried parts.
    multipart: file.size > MULTIPART_THRESHOLD,
    onUploadProgress: ({ loaded, total }) => {
      if (total > 0) onProgress?.(loaded / total);
    },
  });
  return blob.pathname;
}

/** Step 2: POST the JSON "record it" call, returning the new Media id. */
export async function recordUpload(
  route: string,
  body: Record<string, unknown>,
  fallbackError: string,
): Promise<{ id: string }> {
  const response = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: { id?: string; error?: string } = await response
    .json()
    .catch(() => ({}));
  if (!response.ok || !result.id) {
    throw new Error(result.error ?? fallbackError);
  }
  return { id: result.id };
}
