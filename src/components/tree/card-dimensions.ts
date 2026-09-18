/**
 * Shared compact-card photo/frame measurements — read by both
 * compact-card-body.tsx (to size the actual DOM elements) and
 * xyflow-adapter.ts (AVATAR_RADIUS/CONNECTOR_CENTER_Y, which need the exact
 * same numbers to draw connector lines that land under the frame rather
 * than short of it or past it). Centralized here instead of duplicated as
 * two independently hand-copied magic numbers, per the "keep in sync by
 * hand" warnings that already existed on both sides before this file.
 */
export const PHOTO_SIZE = 88;
// Matches compact-card-body.tsx's frame `p-1` (Tailwind's 0.25rem = 4px).
export const PHOTO_FRAME_PADDING = 4;
export const FRAME_SIZE = PHOTO_SIZE + PHOTO_FRAME_PADDING * 2;
