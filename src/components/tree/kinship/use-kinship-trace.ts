"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { buildGenealogyGraph } from "@/domain/relationship/genealogy-graph";
import { findRelationshipPath } from "@/domain/relationship/genealogy-algorithms";
import {
  describeKinship,
  describePathStops,
  type KinGender,
} from "@/domain/relationship/kinship-terms";
import { applyRelationshipTrace } from "@/domain/tree/tree-trace";
import type { TreeClientGraphPayload } from "@/domain/tree/tree-adapter";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import type { TreeHighlightState } from "../adapters/xyflow-adapter";

export type TraceSlot = "traceA" | "traceB";

/**
 * Relationship Trace state for the tree page. The two people live in the URL
 * (?traceA=/?traceB=, so a compared pair is shareable by link) but are
 * written with history.replaceState, not router navigation: Next.js syncs
 * useSearchParams with it without re-rendering the server page, and the
 * path itself is computed right here from the already-loaded raw graph
 * (findRelationshipPath over PathGraph). Picking a person updates the
 * highlighted path in the same frame, with no request and no extra
 * history entries.
 *
 * The panel's open state is plain component state: a trace outlives the
 * panel (collapsed to the bottom-bar chip), the panel never outlives a page.
 */
export function useKinshipTrace(
  rawGraph: TreeClientGraphPayload,
  graph: TreeLayoutGraph,
) {
  const searchParams = useSearchParams();
  const [isPanelOpen, setPanelOpen] = useState(false);

  const personsById = useMemo(
    () => new Map(rawGraph.persons.map((p) => [p.id, p])),
    [rawGraph],
  );
  const genealogy = useMemo(
    () =>
      buildGenealogyGraph(
        rawGraph.persons,
        rawGraph.parentChildEdges,
        rawGraph.partnershipEdges,
      ),
    [rawGraph],
  );

  const readSlot = (slot: TraceSlot) => {
    const id = searchParams.get(slot);
    return id && personsById.has(id) ? id : null;
  };
  const aId = readSlot("traceA");
  const bId = readSlot("traceB");

  const locale = useLocale();
  const genderOf = useCallback(
    (id: string): KinGender => personsById.get(id)?.gender ?? "unknown",
    [personsById],
  );

  const outcome = useMemo(
    () => (aId && bId ? findRelationshipPath(genealogy, aId, bId) : null),
    [genealogy, aId, bId],
  );
  const summary = useMemo(
    () => (outcome ? describeKinship(outcome, genderOf, locale) : null),
    [outcome, genderOf, locale],
  );
  const stops = useMemo(
    () =>
      outcome?.status === "found"
        ? describePathStops(outcome, genderOf, locale)
        : [],
    [outcome, genderOf, locale],
  );

  // Only a found path dims the tree — "not related" has nothing to point
  // at, and dimming every card for it would read as a broken canvas.
  const traceHighlight = useMemo((): TreeHighlightState | undefined => {
    if (outcome?.status !== "found") return undefined;
    const traced = applyRelationshipTrace(graph, outcome);
    return {
      tracePersonIds: traced.tracePersonIds,
      traceEdgeIds: traced.traceEdgeIds,
      traceEdgeDirections: traced.traceEdgeDirections,
    };
  }, [graph, outcome]);

  const writeSlots = useCallback(
    (next: Partial<Record<TraceSlot, string | null>>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query
          ? `${window.location.pathname}?${query}`
          : window.location.pathname,
      );
    },
    [],
  );

  // Clicking a card fills the first empty slot while the panel is open —
  // see KinshipContext's own doc comment.
  const pickSlot: TraceSlot | null = !isPanelOpen
    ? null
    : !aId
      ? "traceA"
      : !bId
        ? "traceB"
        : null;

  const setSlot = useCallback(
    (slot: TraceSlot, personId: string | null) =>
      writeSlots({ [slot]: personId }),
    [writeSlots],
  );

  const pick = useCallback(
    (personId: string) => {
      if (!pickSlot || personId === aId || personId === bId) return;
      writeSlots({ [pickSlot]: personId });
    },
    [pickSlot, aId, bId, writeSlots],
  );

  const swap = useCallback(
    () => writeSlots({ traceA: bId, traceB: aId }),
    [aId, bId, writeSlots],
  );

  const reset = useCallback(
    () => writeSlots({ traceA: null, traceB: null }),
    [writeSlots],
  );

  const compareWith = useCallback(
    (personId: string) => {
      writeSlots({ traceA: personId, traceB: null });
      setPanelOpen(true);
    },
    [writeSlots],
  );

  return {
    aId,
    bId,
    outcome,
    summary,
    stops,
    personsById,
    traceHighlight,
    isPanelOpen,
    setPanelOpen,
    pickSlot,
    setSlot,
    pick,
    swap,
    reset,
    compareWith,
  };
}

export type KinshipTrace = ReturnType<typeof useKinshipTrace>;
