/**
 * Derives the dark "sepia" page backdrop for the Person Profile and Story
 * pages from a photo's sampled `dominantColor` (see
 * media.service.ts::sampleLeftEdgeColor) — the page reads as a continuation
 * of the portrait's own tone instead of a fixed brand color, per the
 * reference screenshots the user picked for these pages.
 *
 * Only the photo's HUE is kept (plus a small, capped chroma): lightness is
 * always pinned dark by the CSS that consumes these values
 * (globals.css `.photo-backdrop`), so a light studio-wall sample like
 * #dfdfdf still produces a dark page rather than a light one. Near-grey
 * samples carry no meaningful hue, so they fall back to the app's own warm
 * brown (the same hue 50 as the `.dark` theme's --background).
 */

const FALLBACK_HUE = 50;
const FALLBACK_CHROMA = 0.02;
/** Below this OKLCH chroma a sample reads as grey — its hue is noise. */
const GREY_CHROMA = 0.02;
/** Keeps a saturated photo from turning the whole page into a colored wash. */
const MAX_CHROMA = 0.04;

export interface PhotoBackdrop {
  hue: number;
  chroma: number;
}

export function photoBackdrop(hex: string | null | undefined): PhotoBackdrop {
  const lch = hex ? hexToOklch(hex) : null;
  if (!lch || lch.c < GREY_CHROMA) {
    return { hue: FALLBACK_HUE, chroma: FALLBACK_CHROMA };
  }
  return {
    hue: Math.round(lch.h),
    chroma: Math.round(Math.min(lch.c, MAX_CHROMA) * 1000) / 1000,
  };
}

/** CSS custom properties read by `.photo-backdrop` in globals.css. */
export function photoBackdropStyle(
  hex: string | null | undefined,
): Record<"--backdrop-hue" | "--backdrop-chroma", string> {
  const { hue, chroma } = photoBackdrop(hex);
  return { "--backdrop-hue": String(hue), "--backdrop-chroma": String(chroma) };
}

function hexToOklch(hex: string): { l: number; c: number; h: number } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const [r, g, b] = [1, 3, 5].map((i) =>
    toLinear(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

function toLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}
