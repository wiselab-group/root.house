"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_MAP_THEME,
  MAP_THEMES,
  type MapThemeId,
} from "@/lib/map-theme/map-theme";

const KEY = "root-house:map-theme";

function isThemeId(value: unknown): value is MapThemeId {
  return typeof value === "string" && value in MAP_THEMES;
}

/**
 * The viewer's chosen map look, remembered in this browser only — a
 * per-viewer convenience (losing it just shows the default). Saving it in
 * the profile like the language would need a migration on the shared
 * database; not done without the owner's go-ahead. Storage can be
 * unavailable (private mode) — then the choice lasts for the visit.
 */
export function useMapTheme() {
  const [theme, setTheme] = useState<MapThemeId>(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      return isThemeId(saved) ? saved : DEFAULT_MAP_THEME;
    } catch {
      return DEFAULT_MAP_THEME;
    }
  });

  const choose = useCallback((next: MapThemeId) => {
    setTheme(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked — keep the choice for this visit only.
    }
  }, []);

  return [theme, choose] as const;
}
