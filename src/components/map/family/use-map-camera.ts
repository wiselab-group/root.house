"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { FamilyMapState } from "./use-family-map";

const DESKTOP = "(min-width: 768px) and (pointer: fine)";
const PLACE_ZOOM = 6;
const MAX_FIT_ZOOM = 7;

/** Room the panel/sheet and the dock take — fitted views stay clear of
 *  them. While the story plays a phone's sheet steps aside for the dock. */
function padding(story = false) {
  if (window.matchMedia(DESKTOP).matches) {
    return { top: 64, bottom: story ? 200 : 140, left: 420, right: 64 };
  }
  return { top: 48, bottom: story ? 200 : 300, left: 32, right: 32 };
}

/**
 * Moves the camera with the user's focus: the whole family on first load,
 * a lit branch/person path framed, a place centred. Instant under reduced
 * motion. Never moves on returning to the overview — the user keeps the
 * view they were looking at.
 */
export function useMapCamera(
  mapRef: RefObject<MapRef | null>,
  state: FamilyMapState,
  reducedMotion: boolean,
) {
  const { data, focus, highlight } = state;
  const lngLat = useCallback(
    (id: string): [number, number] | null => {
      const p = data.places.find((place) => place.id === id);
      return p?.latitude != null && p.longitude != null
        ? [p.longitude, p.latitude]
        : null;
    },
    [data.places],
  );

  const fit = useCallback(
    (placeIds: string[], animate: boolean, story = false) => {
      const map = mapRef.current;
      const points = placeIds.map(lngLat).filter((p) => p !== null);
      if (!map || points.length === 0) return;
      const lngs = points.map((p) => p[0]);
      const lats = points.map((p) => p[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        // fitBounds even for one place: easeTo({ padding }) would keep that
        // padding on the map for good, and every later fit adds its own on
        // top — on a phone that overflowed the screen and flew to Africa.
        {
          padding: padding(story),
          maxZoom: points.length === 1 ? PLACE_ZOOM : MAX_FIT_ZOOM,
          duration: animate ? 1100 : 0,
        },
      );
    },
    [lngLat, mapRef],
  );

  /** The whole family — on load, and before the story plays. */
  const fitAll = useCallback(
    (animate = false, story = false) => {
      const used = new Set(data.model.stops.map((s) => s.placeId));
      const ids = data.places
        .filter((p) => used.size === 0 || used.has(p.id))
        .map((p) => p.id);
      fit(ids, animate, story);
    },
    [data, fit],
  );

  const focusKey =
    focus.kind === "place"
      ? `p:${focus.placeId}`
      : focus.kind === "branch"
        ? `b:${focus.rootId}`
        : focus.kind === "person"
          ? `h:${focus.personId}`
          : null;
  const lastKey = useRef<string | null>(null);
  const loaded = useRef(false);

  const follow = useCallback(() => {
    if (!loaded.current || !focusKey || focusKey === lastKey.current) return;
    lastKey.current = focusKey;
    if (focus.kind === "place") fit([focus.placeId], !reducedMotion);
    else if (highlight) fit(highlight.placeIds, !reducedMotion);
  }, [focusKey, focus, highlight, fit, reducedMotion]);

  useEffect(() => {
    if (!focusKey) lastKey.current = null;
    follow();
  }, [focusKey, follow]);

  const onLoad = useCallback(() => {
    loaded.current = true;
    if (focusKey) follow();
    else fitAll();
  }, [focusKey, follow, fitAll]);

  return { onLoad, fitAll };
}
