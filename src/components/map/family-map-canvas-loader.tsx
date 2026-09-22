"use client";

import dynamic from "next/dynamic";
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
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Загружаем карту…
      </div>
    ),
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
