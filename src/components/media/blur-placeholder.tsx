// A tiny solid warm-muted-tone PNG used as the blur placeholder — photos are
// served through our own authenticated /api/media/[id] route, which
// Next.js's image optimizer can't treat as a cacheable static source, so
// `unoptimized` is required and a static blurDataURL is the only way to get
// a placeholder at all (no on-the-fly blur generation is possible here).
// Shared between PersonMediaGallery, PhotoGrid, and PhotoLightbox.
export const BLUR_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGN49/wBHDEQxwEAZ3ArUaHgM3YAAAAASUVORK5CYII=";
