"use client";

import { useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { MapView } from "./map-view";
import { LocationPin } from "./location-pin";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** No point yet: a view of Europe, where the family archives mostly are. */
const EMPTY_VIEW = { latitude: 52, longitude: 25, zoom: 3 };
const POINT_ZOOM = 11;

/**
 * A small map for choosing a Place's point by hand (user request: not only
 * by searching an address) — a click drops the pin, dragging moves it.
 * `flyToken` changes when the point was set from OUTSIDE the map (an
 * address search result), which then flies the map there; a click on the
 * map itself doesn't move the view under the user's cursor.
 */
export function LocationPickerMap({
  point,
  flyToken,
  onPick,
}: {
  point: LatLng | null;
  flyToken: number;
  onPick: (point: LatLng) => void;
}) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (flyToken === 0 || !point) return;
    mapRef.current?.flyTo({
      center: [point.longitude, point.latitude],
      zoom: Math.max(mapRef.current.getZoom(), POINT_ZOOM),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 900,
    });
    // Only an outside change (flyToken) moves the view — see doc comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken]);

  const initial = point ? { ...point, zoom: POINT_ZOOM } : EMPTY_VIEW;

  return (
    <div className="relative h-56 overflow-hidden rounded-lg border border-input">
      <MapView
        ref={mapRef}
        initialLatitude={initial.latitude}
        initialLongitude={initial.longitude}
        initialZoom={initial.zoom}
        cursor="crosshair"
        onMapClick={onPick}
      >
        {point && (
          <LocationPin
            latitude={point.latitude}
            longitude={point.longitude}
            onMove={onPick}
          />
        )}
      </MapView>
      {!point && (
        <p className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-background/80 px-3 py-1 text-xs text-foreground backdrop-blur-sm">
          Нажмите на карту, чтобы поставить отметку
        </p>
      )}
    </div>
  );
}
