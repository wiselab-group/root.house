"use client";

import { useMemo, useState } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import { arcPoints, partialArc, type LngLat } from "@/domain/place/route-arc";
import { resolveCssColor } from "@/lib/css-color";
import type { FamilyMapState } from "./use-family-map";

type Tone = "trace" | "fresh" | "settled" | "old" | "dim";

interface RouteFeature {
  type: "Feature";
  properties: { tone: Tone };
  geometry: { type: "LineString"; coordinates: LngLat[] };
}

/** MapLibre paints in WebGL — the tokens are resolved to rgba once
 *  (css-color.ts), read off the map's own frame so a map theme's
 *  --map-route applies; the app's theme is fixed per page load. */
function usePalette() {
  // Custom properties inherit — the container sees the theme frame's tokens.
  const frame = useMap().current?.getContainer();
  const [palette] = useState(() => ({
    action: resolveCssColor("--primary", "rgb(185, 92, 40)", frame),
    branch: resolveCssColor("--map-route", "rgb(160, 130, 110)", frame),
  }));
  return palette;
}

/**
 * The family's moves as arcs. Routes draw themselves in during their first
 * years on the timeline (a sliced arc, `progress`), recent moves are solid,
 * older ones settle into a dotted trail; a lit branch/person path is
 * terracotta and everything else fades back.
 */
export function RouteLayer({ state }: { state: FamilyMapState }) {
  const { data, snapshot, highlight } = state;
  const palette = usePalette();

  const lngLat = useMemo(() => {
    const byId = new Map<string, LngLat>();
    for (const p of data.places) {
      if (p.latitude != null && p.longitude != null) {
        byId.set(p.id, [p.longitude, p.latitude]);
      }
    }
    return byId;
  }, [data.places]);

  const arcs = useMemo(() => {
    const byRoute = new Map<string, LngLat[]>();
    for (const r of data.model.routes) {
      const from = lngLat.get(r.fromPlaceId);
      const to = lngLat.get(r.toPlaceId);
      if (from && to) byRoute.set(r.id, arcPoints(from, to));
    }
    return byRoute;
  }, [data.model.routes, lngLat]);

  const collection = useMemo<{
    type: "FeatureCollection";
    features: RouteFeature[];
  }>(
    () => ({
      type: "FeatureCollection",
      features: snapshot.routes.flatMap((view) => {
        const arc = arcs.get(view.route.id);
        if (!arc || view.progress <= 0) return [];
        let tone: Tone = view.recent ? "fresh" : "settled";
        if (highlight) {
          tone = highlight.routeIds.has(view.route.id) ? "trace" : "dim";
        } else if (state.moment === "all") {
          tone = "old";
        }
        const feature: RouteFeature = {
          type: "Feature",
          properties: { tone },
          geometry: {
            type: "LineString",
            coordinates: partialArc(arc, view.progress),
          },
        };
        return [feature];
      }),
    }),
    [snapshot.routes, arcs, highlight, state.moment],
  );

  return (
    <Source id="family-routes" type="geojson" data={collection}>
      <Layer
        id="family-routes-dotted"
        type="line"
        filter={["in", ["get", "tone"], ["literal", ["old", "settled", "dim"]]]}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": palette.branch,
          "line-width": 2.5,
          "line-dasharray": [0.1, 2.4],
          "line-opacity": [
            "match",
            ["get", "tone"],
            "dim",
            0.3,
            "settled",
            0.75,
            0.9,
          ],
        }}
      />
      <Layer
        id="family-routes-solid"
        type="line"
        filter={["in", ["get", "tone"], ["literal", ["fresh", "trace"]]]}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": [
            "match",
            ["get", "tone"],
            "trace",
            palette.action,
            palette.branch,
          ],
          "line-width": ["match", ["get", "tone"], "trace", 4, 3.5],
        }}
      />
    </Source>
  );
}
