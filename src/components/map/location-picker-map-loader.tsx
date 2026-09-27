"use client";

import dynamic from "next/dynamic";
import { MapLoading } from "./map-loading";

/**
 * Lazy, client-only LocationPickerMap — MapLibre touches window/canvas at
 * module load, and a Place form shouldn't pay for the map bundle until it
 * actually renders. Same pattern as family-map-canvas-loader.tsx.
 */
export const LocationPickerMapLoader = dynamic(
  () => import("./location-picker-map").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);
