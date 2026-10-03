"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildFeed,
  pathOf,
  snapshotAt,
  timelineRange,
  type MapMoment,
} from "@/domain/place/map-snapshot";
import type { FamilyMapData } from "@/domain/place/place-map.service";

export type MapFocus =
  | { kind: "overview" }
  | { kind: "search" }
  | { kind: "place"; placeId: string }
  | { kind: "branch"; rootId: string }
  | { kind: "person"; personId: string };

/** A path lit on the map — a branch's or one person's. */
export interface MapHighlight {
  placeIds: string[];
  routeIds: Set<string>;
  /** A person's stops are numbered in the order they were reached. */
  numbered: boolean;
}

const URL_KEYS = {
  place: "place",
  branch: "branch",
  person: "person",
} as const;

/** Mirrors the focus into the address (shareable, survives reload) without
 *  a navigation — the page's data doesn't change with it. */
function writeUrl(focus: MapFocus, data: FamilyMapData) {
  const url = new URL(window.location.href);
  for (const key of Object.values(URL_KEYS)) url.searchParams.delete(key);
  if (focus.kind === "place") url.searchParams.set("place", focus.placeId);
  if (focus.kind === "branch") url.searchParams.set("branch", focus.rootId);
  if (focus.kind === "person") {
    const slug = data.people[focus.personId]?.slug;
    if (slug) url.searchParams.set("person", slug);
  }
  window.history.replaceState(null, "", url);
}

export function useFamilyMap(
  data: FamilyMapData,
  initialFocus: MapFocus,
  family: { familyId: string; familySlug: string; canEdit: boolean },
) {
  const [focus, setFocusState] = useState<MapFocus>(initialFocus);
  const [moment, setMoment] = useState<MapMoment>("all");
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const setFocus = useCallback(
    (next: MapFocus) => {
      setFocusState(next);
      setHoveredBranch(null);
      writeUrl(next, data);
    },
    [data],
  );

  const snapshot = useMemo(
    () => snapshotAt(data.model, moment, playing),
    [data.model, moment, playing],
  );
  const range = useMemo(() => timelineRange(data.model), [data.model]);
  const feed = useMemo(() => buildFeed(data.model), [data.model]);
  const branchById = useMemo(
    () => new Map(data.branches.map((b) => [b.rootId, b])),
    [data.branches],
  );

  const highlight = useMemo<MapHighlight | null>(() => {
    const branchId =
      focus.kind === "branch" ? focus.rootId : (hoveredBranch ?? null);
    const branch = branchId ? branchById.get(branchId) : undefined;
    if (branch) {
      const path = pathOf(data.model, new Set(branch.memberIds));
      return {
        placeIds: branch.placeIds,
        routeIds: path.routeIds,
        numbered: false,
      };
    }
    if (focus.kind === "person") {
      const path = pathOf(data.model, new Set([focus.personId]));
      return { ...path, numbered: true };
    }
    return null;
  }, [focus, hoveredBranch, branchById, data.model]);

  // Escape steps back: a detail → the overview, a year → «Всё время».
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.target instanceof HTMLInputElement)
        return;
      if (focus.kind !== "overview") setFocus({ kind: "overview" });
      else if (moment !== "all") setMoment("all");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focus, moment, setFocus]);

  return {
    ...family,
    data,
    focus,
    setFocus,
    moment,
    setMoment,
    playing,
    setPlaying,
    snapshot,
    range,
    feed,
    branchById,
    highlight,
    hoveredBranch,
    setHoveredBranch,
  };
}

export type FamilyMapState = ReturnType<typeof useFamilyMap>;
