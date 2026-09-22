"use client";

import { Marker } from "react-map-gl/maplibre";
import { MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom pin replacing MapLibre's default teardrop marker — a plain circular
 * badge in the app's terracotta action color (matches the tree's own
 * "terracotta = what you're looking at/acting on" rule, see CLAUDE.md's
 * Design Tokens section), sized larger when it carries linked people/events
 * so a marker with real content stands out from a bare Place pin.
 */
export function MapMarker({
  longitude,
  latitude,
  hasContent,
  isSelected,
  onClick,
}: {
  longitude: number;
  latitude: number;
  hasContent: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      onClick={(e) => {
        // react-map-gl's Marker attaches its click listener directly to the
        // MapLibre marker element rather than relying on React's synthetic
        // bubbling from a nested button — an onClick on our own inner
        // <button> never fired. Stop the event from also reaching the
        // underlying map (which would otherwise treat it as a map click and
        // could pan/deselect) — same pattern maplibre-gl's own examples use.
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <button
        type="button"
        className={cn(
          "flex items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          hasContent ? "size-9" : "size-6 opacity-80",
          isSelected && "scale-110 ring-3 ring-ring/50",
        )}
        aria-label="Показать место"
      >
        <MapPinIcon
          className={hasContent ? "size-4" : "size-3"}
          strokeWidth={2}
        />
      </button>
    </Marker>
  );
}
