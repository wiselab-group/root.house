"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { setMapThemeAction } from "@/actions/map-theme.actions";
import type { MapThemeId } from "@/lib/map-theme/map-theme";

/**
 * The viewer's chosen map look, saved in their profile (users.map_theme)
 * so it follows them across devices, like the language. The map switches
 * at once; the save runs in the background — if it fails, only the next
 * visit falls back to the saved look.
 */
export function useMapTheme(
  initial: MapThemeId,
  places: readonly { name: string }[],
) {
  const [theme, setTheme] = useState<MapThemeId>(initial);
  const [, startSaving] = useTransition();

  const choose = useCallback((next: MapThemeId) => {
    setTheme(next);
    startSaving(() => setMapThemeAction(next));
  }, []);

  // What MapView paints: the look, and the names our own pins already
  // carry — the basemap stays quiet there.
  const mapTheme = useMemo(
    () => ({ id: theme, hideLabelNames: places.map((p) => p.name) }),
    [theme, places],
  );

  return { themeId: theme, setThemeId: choose, theme: mapTheme };
}
