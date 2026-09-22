"use client";

import { useMemo, useState } from "react";
import { MapView } from "./map-view";
import { MapMarker } from "./map-marker";
import { MapPopup } from "./map-popup";
import type { PlaceMarker } from "@/domain/place/place-marker.service";

const DEFAULT_LONGITUDE = 25; // roughly Eastern Europe — the family archive's likely center of gravity
const DEFAULT_LATITUDE = 51;
const DEFAULT_ZOOM = 3.5;
const FOCUSED_ZOOM = 3.5;

/**
 * The one client component that actually composes the maplibre-gl-backed
 * primitives (MapView/MapMarker/MapPopup) with this page's marker data —
 * dynamically imported (ssr: false) from page.tsx since MapLibre touches
 * window/canvas at module scope. Initial viewport centers on the average of
 * all markers (falls back to a wide Eastern-Europe default when there are
 * none yet) rather than a hardcoded single city, so a family whose places
 * cluster anywhere in the world still opens centered on their own data.
 */
export function FamilyMapCanvas({
  markers,
  familySlug,
}: {
  markers: PlaceMarker[];
  familySlug: string;
}) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const initialView = useMemo(() => {
    if (markers.length === 0) {
      return {
        longitude: DEFAULT_LONGITUDE,
        latitude: DEFAULT_LATITUDE,
        zoom: DEFAULT_ZOOM,
      };
    }
    const avgLng =
      markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length;
    const avgLat =
      markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length;
    return {
      longitude: avgLng,
      latitude: avgLat,
      zoom: markers.length === 1 ? FOCUSED_ZOOM : DEFAULT_ZOOM,
    };
  }, [markers]);

  const selectedMarker = markers.find((m) => m.placeId === selectedPlaceId);

  return (
    <MapView
      initialLongitude={initialView.longitude}
      initialLatitude={initialView.latitude}
      initialZoom={initialView.zoom}
      className="rounded-2xl"
    >
      {markers.map((marker) => (
        <MapMarker
          key={marker.placeId}
          longitude={marker.longitude}
          latitude={marker.latitude}
          hasContent={marker.people.length > 0 || marker.events.length > 0}
          isSelected={marker.placeId === selectedPlaceId}
          onClick={() => setSelectedPlaceId(marker.placeId)}
        />
      ))}
      {selectedMarker && (
        <MapPopup
          marker={selectedMarker}
          familySlug={familySlug}
          onClose={() => setSelectedPlaceId(null)}
        />
      )}
    </MapView>
  );
}
