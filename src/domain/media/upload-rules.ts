/**
 * Upload limits and key layout — shared by the browser (pickers, the
 * direct-to-Blob upload) and the server (the upload token route and the
 * finalize routes), so the two can never disagree.
 *
 * Photos and documents go from the browser straight into private Blob
 * storage, never through our own function body (Vercel caps that at
 * ~4.5MB) — which is what makes a 25MB limit possible at all.
 */
export type UploadKind = "photo" | "document";

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

/** A multi-page scan fits comfortably. */
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/tiff",
];

export const DOCUMENT_ACCEPT = [...DOCUMENT_CONTENT_TYPES, ".heic"].join(",");

export const UPLOAD_RULES: Record<
  UploadKind,
  { maxBytes: number; contentTypes: string[] }
> = {
  photo: { maxBytes: PHOTO_MAX_BYTES, contentTypes: PHOTO_CONTENT_TYPES },
  document: {
    maxBytes: DOCUMENT_MAX_BYTES,
    contentTypes: DOCUMENT_CONTENT_TYPES,
  },
};

/** Where a browser may put a new file: its own family's uploads folder. */
export function uploadPrefix(familyId: string): string {
  return `${familyId}/uploads/`;
}

export function isUploadKey(storageKey: string, familyId: string): boolean {
  return (
    storageKey.startsWith(uploadPrefix(familyId)) && !storageKey.includes("..")
  );
}

/** A storage-safe pathname for a picked file — the original name only as a readable hint. */
export function uploadPathname(familyId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
  return `${uploadPrefix(familyId)}${safe}`;
}

export class UploadRejectedError extends Error {}
