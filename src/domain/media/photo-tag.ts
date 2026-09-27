/**
 * Pure validation for tap-to-tag coordinates — no db/next/react imports, so
 * it's unit-testable in isolation (same rationale as domain/family/permissions.ts).
 */

export interface PhotoTagPoint {
  xPercent: number;
  yPercent: number;
}

export class InvalidPhotoTagPointError extends Error {}

/**
 * Rounds to 2 decimal places (matching the numeric(5,2) column) and rejects
 * anything outside [0, 100] rather than silently clamping — a wildly
 * out-of-range value means a client-side bug in the tap's bounding-rect
 * math, not a legitimate edge tap, and should fail loudly instead of being
 * silently moved to an edge.
 */
export function validatePhotoTagPoint(input: {
  xPercent: number;
  yPercent: number;
}): PhotoTagPoint {
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new InvalidPhotoTagPointError(
        `${key} must be a number from 0 to 100, got: ${value}`,
      );
    }
  }
  return {
    xPercent: Math.round(input.xPercent * 100) / 100,
    yPercent: Math.round(input.yPercent * 100) / 100,
  };
}

/** The spotlight radius bounds, as a percentage of the photo's shorter
 *  side: 3% is still a visible light on a face in a big group shot, 60%
 *  already lights most of a portrait. */
export const PHOTO_TAG_RADIUS_MIN = 3;
export const PHOTO_TAG_RADIUS_MAX = 60;
/** What a freshly placed tag starts at before it's adjusted — close to the
 *  old automatic size for a lone face (a quarter of the shorter side). */
export const PHOTO_TAG_RADIUS_DEFAULT = 13;

export class InvalidPhotoTagRadiusError extends Error {}

/**
 * Same contract as validatePhotoTagPoint: rounds to the numeric(5,2) column
 * and rejects anything out of range instead of clamping — the editor
 * clamps on the client, so an out-of-range value here is a bug.
 */
export function validatePhotoTagRadius(radiusPercent: number): number {
  if (
    !Number.isFinite(radiusPercent) ||
    radiusPercent < PHOTO_TAG_RADIUS_MIN ||
    radiusPercent > PHOTO_TAG_RADIUS_MAX
  ) {
    throw new InvalidPhotoTagRadiusError(
      `radiusPercent must be a number from ${PHOTO_TAG_RADIUS_MIN} to ${PHOTO_TAG_RADIUS_MAX}, got: ${radiusPercent}`,
    );
  }
  return Math.round(radiusPercent * 100) / 100;
}
