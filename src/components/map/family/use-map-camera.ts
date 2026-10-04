"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { FamilyMapState } from "./use-family-map";

const DESKTOP = "(min-width: 768px) and (pointer: fine)";
const PLACE_ZOOM = 6;
const MAX_FIT_ZOOM = 7;

/** How much of a phone's screen the sheet takes: a thin strip on the
 *  overview, half on a detail, the dock alone while the story plays. */
type Room = "peek" | "half" | "story";
const PHONE_BOTTOM: Record<Room, number> = { peek: 150, half: 300, story: 200 };

/** Room the panel/sheet and the dock take — fitted views stay clear of
 *  them. */
function padding(room: Room) {
  if (window.matchMedia(DESKTOP).matches) {
    return {
      top: 64,
      bottom: room === "story" ? 200 : 140,
      left: 420,
      right: 64,
    };
  }
  // Labels sit right of their pins, root tags centred under them.
  return { top: 48, bottom: PHONE_BOTTOM[room], left: 64, right: 80 };
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

  const fitPoints = useCallback(
    (points: [number, number][], animate: boolean, room: Room = "half") => {
      const map = mapRef.current;
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
          padding: padding(room),
          maxZoom: points.length === 1 ? PLACE_ZOOM : MAX_FIT_ZOOM,
          duration: animate ? 1100 : 0,
        },
      );
    },
    [mapRef],
  );
  const fit = useCallback(
    (placeIds: string[], animate: boolean, room: Room = "half") =>
      fitPoints(
        placeIds.map(lngLat).filter((p) => p !== null),
        animate,
        room,
      ),
    [fitPoints, lngLat],
  );

  /** The whole family — on load, and before the story plays. */
  const fitAll = useCallback(
    (animate = false, story = false) => {
      const used = new Set(data.model.stops.map((s) => s.placeId));
      const ids = data.places
        .filter((p) => used.size === 0 || used.has(p.id))
        .map((p) => p.id);
      fit(ids, animate, story ? "story" : "peek");
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
          : focus.kind === "editPlace"
            ? `e:${focus.placeId ?? "new"}`
            : null;
  const lastKey = useRef<string | null>(null);
  const loaded = useRef(false);

  const follow = useCallback(() => {
    if (!loaded.current || !focusKey || focusKey === lastKey.current) return;
    lastKey.current = focusKey;
    if (focus.kind === "place") fit([focus.placeId], !reducedMotion);
    else if (focus.kind === "editPlace" && focus.placeId)
      fit([focus.placeId], !reducedMotion);
    else if (highlight) fit(highlight.placeIds, !reducedMotion);
  }, [focusKey, focus, highlight, fit, reducedMotion]);

  useEffect(() => {
    if (!focusKey) lastKey.current = null;
    follow();
  }, [focusKey, follow]);

  // A search result picked while editing a place: go there. A click on the
  // map doesn't bump `fly` — the view stays under the user's cursor.
  const { point, fly } = state.draft;
  const flown = useRef(0);
  useEffect(() => {
    if (fly === flown.current || !point) return;
    flown.current = fly;
    fitPoints([[point.longitude, point.latitude]], !reducedMotion);
  }, [fly, point, fitPoints, reducedMotion]);

  const onLoad = useCallback(() => {
    loaded.current = true;
    if (focusKey) follow();
    else fitAll();
  }, [focusKey, follow, fitAll]);

  return { onLoad, fitAll };
}
