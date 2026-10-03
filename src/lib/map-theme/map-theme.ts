import { resolveCssColor } from "@/lib/css-color";
import { DEFAULT_MAP_THEME, type MapThemeId } from "@/domain/shared/map-theme";
import type { MapPalette } from "./apply-map-theme";

export { DEFAULT_MAP_THEME, type MapThemeId };

/**
 * Map themes are CSS: each is a class on the map's wrapper that may redefine
 * the --map-* tokens (globals.css). «archive» adds no class and so follows
 * the app's own light/dark palette; another theme is one block of
 * variables there plus one entry here (and its id in domain/shared/
 * map-theme.ts) — nothing else changes.
 */
export const MAP_THEMES: Record<MapThemeId, { className: string }> = {
  archive: { className: "" },
  parchment: { className: "map-theme-parchment" },
};

const TOKENS: Record<keyof MapPalette, string> = {
  land: "--map-land",
  forest: "--map-forest",
  water: "--map-water",
  waterShadow: "--map-water-shadow",
  road: "--map-road",
  border: "--map-border",
  countryBorder: "--map-country-border",
  label: "--map-label",
  labelHalo: "--map-label-halo",
  waterLabel: "--map-water-label",
};

/** Reads the theme's palette off the element that carries the theme class.
 *  Client-only. A missing token falls back to a neutral grey. */
export function readMapPalette(element: Element): MapPalette {
  const palette = {} as MapPalette;
  for (const [role, token] of Object.entries(TOKENS) as [
    keyof MapPalette,
    string,
  ][]) {
    palette[role] = resolveCssColor(token, "rgb(128, 128, 128)", element);
  }
  return palette;
}

/**
 * Resolves `token` as theme `id` defines it, independent of when it is
 * asked: a hidden probe carrying the theme's class is read, not the map's
 * frame (whose class may still be the previous theme mid-render).
 * Client-only.
 */
export function readThemeColor(
  id: MapThemeId,
  token: string,
  fallback: string,
): string {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.hidden = true;
  if (MAP_THEMES[id].className) probe.className = MAP_THEMES[id].className;
  document.body.append(probe);
  try {
    return resolveCssColor(token, fallback, probe);
  } finally {
    probe.remove();
  }
}
