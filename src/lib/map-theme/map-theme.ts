import { resolveCssColor } from "@/lib/css-color";
import type { MapPalette } from "./apply-map-theme";

/**
 * Map themes are CSS: each is a class on the map's wrapper that may redefine
 * the --map-* tokens (globals.css). «archive» adds no class and so follows
 * the app's own light/dark palette; another theme is one block of
 * variables there plus one entry here — nothing else changes.
 */
export const MAP_THEMES = {
  archive: { className: "" },
  parchment: { className: "map-theme-parchment" },
} as const;

export type MapThemeId = keyof typeof MAP_THEMES;

export const DEFAULT_MAP_THEME: MapThemeId = "archive";

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
