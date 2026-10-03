"use client";

import { Marker } from "react-map-gl/maplibre";
import { MapPinIcon } from "lucide-react";

/**
 * The pin of a place being edited on the family map (family/family-map.tsx)
 * — a terracotta badge, draggable: dropping it somewhere else moves the
 * place's point. Anchored at the bottom so the
 * point sits at the pin's tip, where the user aimed.
 */
export function LocationPin({
  latitude,
  longitude,
  onMove,
}: {
  latitude: number;
  longitude: number;
  onMove: (point: { latitude: number; longitude: number }) => void;
}) {
  return (
    <Marker
      latitude={latitude}
      longitude={longitude}
      anchor="bottom"
      draggable
      onDragEnd={(e) =>
        onMove({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
      }
    >
      <span
        className="flex size-9 cursor-grab items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-md active:cursor-grabbing"
        aria-hidden="true"
      >
        <MapPinIcon className="size-4" strokeWidth={2} />
      </span>
    </Marker>
  );
}
