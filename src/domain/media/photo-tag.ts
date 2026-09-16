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
        `${key} должен быть числом от 0 до 100, получено: ${value}`,
      );
    }
  }
  return {
    xPercent: Math.round(input.xPercent * 100) / 100,
    yPercent: Math.round(input.yPercent * 100) / 100,
  };
}
