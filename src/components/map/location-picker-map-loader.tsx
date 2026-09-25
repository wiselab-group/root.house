"use client";

import dynamic from "next/dynamic";

/**
 * Lazy, client-only LocationPickerMap — MapLibre touches window/canvas at
 * module load, and a Place form shouldn't pay for the map bundle until it
 * actually renders. Same pattern as family-map-canvas-loader.tsx.
 */
export const LocationPickerMapLoader = dynamic(
  () => import("./location-picker-map").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-lg border border-input bg-muted/30 text-sm text-muted-foreground">
        Загружаем карту…
      </div>
    ),
  },
);
