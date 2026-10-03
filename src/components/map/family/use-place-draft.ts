"use client";

import { useCallback, useState } from "react";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * The point of a place being edited on the family map. The map is the
 * picker: a click (or dragging the pin) sets it where the user aims, and
 * the camera stays put; a search result sets it elsewhere, and `fly`
 * changes so the camera goes there.
 */
export function usePlaceDraft() {
  const [point, setPoint] = useState<LatLng | null>(null);
  const [fly, setFly] = useState(0);

  const reset = useCallback((next: LatLng | null) => setPoint(next), []);
  const pickOnMap = useCallback((next: LatLng) => setPoint(next), []);
  const pickFromSearch = useCallback((next: LatLng) => {
    setPoint(next);
    setFly((n) => n + 1);
  }, []);
  const clear = useCallback(() => setPoint(null), []);

  return { point, fly, reset, pickOnMap, pickFromSearch, clear };
}

export type PlaceDraft = ReturnType<typeof usePlaceDraft>;
