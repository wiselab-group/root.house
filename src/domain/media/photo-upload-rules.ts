/**
 * Photo upload limits and key layout — shared by the browser (pickers,
 * the direct-to-Blob upload) and the server (the upload token route and the
 * finalize step), so the two can never disagree.
 *
 * Photos go from the browser straight into private Blob storage, never
 * through our own function body (Vercel caps that at ~4.5MB) — which is
 * what makes a 25MB limit possible at all.
 */
export const PHOTO_MAX_BYTES = 25 * 1024 * 1024;

export const PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** What a file picker's `accept` lists — `.heic` too, since browsers other than Safari often report an empty type for it. */
export const PHOTO_ACCEPT = [...PHOTO_CONTENT_TYPES, ".heic", ".heif"].join(
  ",",
);

/** Where a browser may put a new photo: its own family's uploads folder. */
export function photoUploadPrefix(familyId: string): string {
  return `${familyId}/uploads/`;
}

export function isPhotoUploadKey(
  storageKey: string,
  familyId: string,
): boolean {
  return (
    storageKey.startsWith(photoUploadPrefix(familyId)) &&
    !storageKey.includes("..")
  );
}

/** A storage-safe pathname for a picked file — the original name only as a readable hint. */
export function photoUploadPathname(
  familyId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "photo";
  return `${photoUploadPrefix(familyId)}${safe}`;
}

export class PhotoUploadRejectedError extends Error {}
