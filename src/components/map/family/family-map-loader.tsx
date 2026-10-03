"use client";

import dynamic from "next/dynamic";
import { MapLoading } from "../map-loading";

// `ssr: false` only works inside a Client Component (Next.js 16) — this thin
// wrapper lets map/page.tsx lazy-load the map without MapLibre's
// window/canvas-touching module ever running on the server.
export const FamilyMapLoader = dynamic(
  () => import("./family-map").then((mod) => mod.FamilyMap),
  { ssr: false, loading: () => <MapLoading /> },
);
