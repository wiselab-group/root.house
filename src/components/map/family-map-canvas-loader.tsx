"use client";

import dynamic from "next/dynamic";
import { MapLoading } from "./map-loading";
import type { PlaceMarker } from "@/domain/place/place-marker.service";

// `ssr: false` is only allowed inside a Client Component as of Next.js 16
// (a Server Component throws a build error) — this thin wrapper exists
// purely so map/page.tsx (a Server Component) can still lazy-load
// FamilyMapCanvas without ever executing MapLibre's window/canvas-touching
// module code on the server. See docs/PRODUCT-REFACTOR.md §M.
const FamilyMapCanvas = dynamic(
  () => import("./family-map-canvas").then((mod) => mod.FamilyMapCanvas),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

export function FamilyMapCanvasLoader({
  markers,
  familySlug,
}: {
  markers: PlaceMarker[];
  familySlug: string;
}) {
  return <FamilyMapCanvas markers={markers} familySlug={familySlug} />;
}
