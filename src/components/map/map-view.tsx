"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import Map, { NavigationControl, type MapRef } from "react-map-gl/maplibre";
import { forwardRef, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MAP_THEMES, type MapThemeId } from "@/lib/map-theme/map-theme";
import type { Locale } from "@/domain/shared/locale";
import { cn } from "@/lib/utils";
import { MapLoading } from "./map-loading";
import { useMapStyle } from "./use-map-style";

/**
 * The ONLY module in the codebase allowed to import maplibre-gl/react-map-gl
 * — mirrors components/tree/adapters/xyflow-adapter.ts's own boundary rule
 * for @xyflow/react. If the map library is ever swapped, this file (plus
 * the map's own components under components/map/) is the only place that changes.
 * Which basemap style it shows, and how it is themed: use-map-style.ts.
 */

// maplibre-gl v6 resolves its tile-parsing worker via
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)` — Turbopack's dev
// server doesn't statically detect that pattern and never emits the worker
// chunk, so the worker silently fails to start (no console error, zero
// .pbf requests, map stays a blank background forever). Confirmed via a
// live Playwright reproduction: page.workers() stayed empty and onLoad
// never fired even after 8s, despite style.json/sprite/tiles.json all
// returning 200. Fix: point maplibre at a copy of its own worker file
// served from public/ (scripts/copy-maplibre-worker.mjs, run on every
// `pnpm install` via postinstall) instead of letting it resolve one at
// module-load time. Must run before the first `new maplibregl.Map(...)`.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export const MapView = forwardRef<
  MapRef,
  {
    initialLongitude: number;
    initialLatitude: number;
    initialZoom: number;
    children?: React.ReactNode;
    className?: string;
    /** A click on the map itself (not on a marker) — e.g. the location picker dropping a pin. */
    onMapClick?: (point: { latitude: number; longitude: number }) => void;
    /** CSS cursor over the map canvas — "crosshair" when clicks place a pin. */
    cursor?: string;
    /** The style and first tiles are in — safe to fit/fly the camera. */
    onLoad?: () => void;
    /** Paint the basemap in a map theme; `hideLabelNames` — places the
     *  caller labels itself, so the basemap doesn't print them twice. */
    theme?: { id: MapThemeId; hideLabelNames?: readonly string[] };
    /** Zoom +/- buttons — off where pinch/scroll is enough (family map). */
    showZoom?: boolean;
  }
>(function MapView(
  {
    initialLongitude,
    initialLatitude,
    initialZoom,
    children,
    className,
    onMapClick,
    cursor,
    onLoad,
    theme,
    showZoom = true,
  },
  ref,
) {
  const t = useTranslations("map");
  const locale = useLocale();
  const hasKey = Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);
  const frameRef = useRef<HTMLDivElement>(null);
  const themeId = theme?.id;
  const style = useMapStyle(frameRef, locale as Locale, hasKey, theme);

  if (!hasKey) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
        {t("noKey")}
      </div>
    );
  }

  // The frame carries the theme class: its --map-* tokens are what the
  // theme is painted from, so it exists before the style is built.
  const frameClass = cn(
    "size-full",
    themeId && ["map-themed", MAP_THEMES[themeId].className],
    className,
  );
  if (!style) {
    return (
      <div ref={frameRef} className={frameClass}>
        <MapLoading />
      </div>
    );
  }

  return (
    <div ref={frameRef} className={frameClass}>
      <Map
        ref={ref}
        mapStyle={style}
        initialViewState={{
          longitude: initialLongitude,
          latitude: initialLatitude,
          zoom: initialZoom,
        }}
        style={{ width: "100%", height: "100%" }}
        cursor={cursor}
        onLoad={onLoad}
        onClick={
          onMapClick
            ? (e) =>
                onMapClick({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
            : undefined
        }
      >
        {showZoom && (
          <NavigationControl position="bottom-right" showCompass={false} />
        )}
        {children}
      </Map>
    </div>
  );
});
