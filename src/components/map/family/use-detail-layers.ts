"use client";

import { useEffect, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { DETAIL_LAYER_IDS } from "@/lib/map-theme/apply-map-theme";

/** Villages, hamlets and road names show only while a place is being
 *  placed by hand — the rest of the time the map stays about the family. */
export function useDetailLayers(
  mapRef: RefObject<MapRef | null>,
  visible: boolean,
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;
    for (const id of DETAIL_LAYER_IDS) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    }
  }, [mapRef, visible]);
}
