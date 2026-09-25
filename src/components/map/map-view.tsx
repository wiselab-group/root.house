"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import Map, { NavigationControl, type MapRef } from "react-map-gl/maplibre";
import { forwardRef, useEffect, useState } from "react";
import { localizeStyleLabels } from "@/lib/maptiler-style-language";

/**
 * The ONLY module in the codebase allowed to import maplibre-gl/react-map-gl
 * — mirrors components/tree/adapters/xyflow-adapter.ts's own boundary rule
 * for @xyflow/react. If the map library is ever swapped, this file (plus
 * map-marker.tsx/map-popup.tsx) is the only place that changes.
 *
 * Style is MapTiler's hosted vector style (see docs/PRODUCT-REFACTOR.md §M
 * for the MapLibre-vs-Leaflet decision and MapTiler-vs-Stadia provider
 * choice) — "streets-v2" chosen over MapTiler's more saturated default for
 * closer alignment with the app's warm/muted palette; can be swapped for a
 * hand-tuned custom style later without touching any caller of MapView.
 */
const MAPTILER_STYLE_URL = (() => {
  const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
})();

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
  },
  ref,
) {
  const hasKey = Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);

  useEffect(() => {
    if (!hasKey) return;
    let cancelled = false;
    fetch(MAPTILER_STYLE_URL)
      .then((res) => res.json())
      .then((raw: StyleSpecification) => {
        if (!cancelled) setStyle(localizeStyleLabels(raw));
      })
      .catch(() => {
        // Falls back to letting maplibre fetch+parse the style URL itself
        // if our own client-side fetch fails (e.g. offline) — no Russian
        // label rewrite in that case, but the map still renders.
        if (!cancelled) setStyle(MAPTILER_STYLE_URL);
      });
    return () => {
      cancelled = true;
    };
  }, [hasKey]);

  if (!hasKey) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
        Карта недоступна — не настроен ключ MapTiler.
      </div>
    );
  }

  if (!style) {
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground">
          Загружаем карту…
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
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
        onClick={
          onMapClick
            ? (e) =>
                onMapClick({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
            : undefined
        }
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {children}
      </Map>
    </div>
  );
});
