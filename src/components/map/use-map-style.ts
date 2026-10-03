"use client";

import { useEffect, useState, type RefObject } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { localizeStyleLabels } from "@/lib/maptiler-style-language";
import { applyMapTheme } from "@/lib/map-theme/apply-map-theme";
import { readMapPalette, type MapThemeId } from "@/lib/map-theme/map-theme";
import type { Locale } from "@/domain/shared/locale";

/**
 * Two looks of MapTiler's hosted styles (docs/PRODUCT-REFACTOR.md §M):
 * "streets-v2" where detail matters (picking a point), and, with a theme,
 * the sparse "dataviz" re-coloured in the app's own palette — the family
 * map, where the family is the content and the basemap only sets the scene.
 */
function styleUrl(name: "streets-v2" | "dataviz") {
  const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  return `https://api.maptiler.com/maps/${name}/style.json?key=${key}`;
}

/** Fetches the style, labels it in the viewer's language and — with a
 *  theme — paints it from the --map-* tokens on `frameRef`'s element. */
export function useMapStyle(
  frameRef: RefObject<HTMLDivElement | null>,
  locale: Locale,
  enabled: boolean,
  theme?: { id: MapThemeId; hideLabelNames?: readonly string[] },
) {
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);
  const themeId = theme?.id;
  const hidden = theme?.hideLabelNames?.join("\n") ?? "";

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const url = styleUrl(themeId ? "dataviz" : "streets-v2");
    fetch(url)
      .then((res) => res.json())
      .then((raw: StyleSpecification) => {
        if (cancelled) return;
        const localized = localizeStyleLabels(raw, locale);
        const frame = frameRef.current;
        setStyle(
          themeId && frame
            ? applyMapTheme(localized, readMapPalette(frame), {
                locale,
                hideLabelNames: hidden ? hidden.split("\n") : [],
              })
            : localized,
        );
      })
      .catch(() => {
        // Falls back to letting maplibre fetch+parse the style URL itself
        // if our own client-side fetch fails (e.g. offline) — no label
        // rewrite or theme in that case, but the map still renders.
        if (!cancelled) setStyle(url);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, locale, themeId, hidden, frameRef]);

  return style;
}
