import { UploadRejectedError } from "./upload-rules";

/** Long enough for «кто, где, когда» plus a sentence of context; a longer
 *  story belongs in a Story, not under a photo. */
export const PHOTO_CAPTION_MAX_LENGTH = 300;

/**
 * A photo's caption, stored in `media.title` — the one column the grid,
 * lightbox and story slides already read as the photo's alt text and
 * visible caption. Whitespace (including line breaks) collapses to single
 * spaces: a caption is one line of text. Empty means "no caption" (null),
 * so the UI falls back to its generic «Семейное фото» alt. Anything that
 * isn't a string is treated as no caption rather than rejected — the upload
 * route passes the client's JSON field straight through.
 */
export function normalizePhotoCaption(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const caption = raw.replace(/\s+/g, " ").trim();
  if (caption.length === 0) return null;
  if (caption.length > PHOTO_CAPTION_MAX_LENGTH) {
    throw new UploadRejectedError("captionTooLong", {
      max: PHOTO_CAPTION_MAX_LENGTH,
    });
  }
  return caption;
}
