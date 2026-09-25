import type { MediaSize } from "@/domain/media/media.service";

/**
 * The one place media URLs are built. `size` picks the downscaled copy made
 * at upload (see domain/media/image-variants.ts):
 * - "thumb" — trees, avatars, grids, album covers;
 * - "display" — lightbox, profile hero, story slides;
 * - "original" — the untouched file (what downloads return).
 * The route falls back to the original for a photo without that copy.
 */
export function mediaUrl(
  mediaId: string,
  familyId: string,
  size: MediaSize,
): string {
  const query = new URLSearchParams({ familyId });
  if (size !== "original") query.set("size", size);
  return `/api/media/${mediaId}?${query}`;
}

/** Always the original, served as an attachment. */
export function mediaDownloadUrl(mediaId: string, familyId: string): string {
  return `/api/media/${mediaId}?${new URLSearchParams({ familyId, download: "1" })}`;
}

/** Anonymous Share Link sibling of mediaUrl — see app/api/share/[token]/media. */
export function shareMediaUrl(
  token: string,
  mediaId: string,
  size: MediaSize,
): string {
  const query = size === "original" ? "" : `?size=${size}`;
  return `/api/share/${token}/media/${mediaId}${query}`;
}
