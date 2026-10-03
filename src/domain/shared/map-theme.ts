/**
 * The family map's looks, by id — shared by the database column
 * (users.map_theme), the server action that saves a choice and the UI
 * (lib/map-theme/map-theme.ts adds each one's CSS class).
 */
export const MAP_THEME_IDS = ["archive", "parchment"] as const;

export type MapThemeId = (typeof MAP_THEME_IDS)[number];

export const DEFAULT_MAP_THEME: MapThemeId = "archive";

export function isMapThemeId(value: unknown): value is MapThemeId {
  return (
    typeof value === "string" &&
    (MAP_THEME_IDS as readonly string[]).includes(value)
  );
}
