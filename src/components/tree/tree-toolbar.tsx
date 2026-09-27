"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TreeCanvas } from "./tree-canvas";
import { TreeFilterPanel } from "./tree-filter-panel";
import { isEmptyFilter, type PersonFilter } from "@/domain/tree/tree-filter";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import type { TreeClientGraphPayload } from "@/domain/tree/tree-adapter";
import type { TreeHighlightState } from "./adapters/xyflow-adapter";
import { KinshipButton } from "./kinship/kinship-button";
import { KinshipProvider } from "./kinship/kinship-context";
import { KinshipPanel } from "./kinship/kinship-panel";
import { useKinshipTrace } from "./kinship/use-kinship-trace";

/**
 * Wraps TreeCanvas with Filter and Relationship Trace (plan §16-17).
 *
 * Filter is a row in TreeCanvas's "Инструменты" menu that opens
 * TreeFilterPanel (a dialog owned here); it writes ?filter= with a real
 * navigation, since the server re-lays out the filtered tree.
 *
 * Relationship Trace ("Родство") has its own button beside that menu and
 * its own non-modal panel (kinship/). It runs entirely in the browser off
 * the raw graph the page already sent — see useKinshipTrace — and reaches
 * the tree through two channels: highlight sets merged into `highlight`
 * below, and KinshipContext for the cards (pick-on-click, "Сравнить с…").
 */
export function TreeToolbar({
  familyId,
  familySlug,
  graph,
  rawGraph,
  highlight,
  filter,
}: {
  familyId: string;
  /** The family's URL slug — threaded down to TreeCanvas for each card's click-popover profile link. */
  familySlug: string;
  graph: TreeLayoutGraph;
  /** Rewrite plan §7 Stage 7 — the client-safe raw graph (getRawTreeGraph). TreeCanvas re-runs buildTreeLayout on it for focus switches; the Relationship Trace panel searches paths in it. */
  rawGraph: TreeClientGraphPayload;
  highlight?: TreeHighlightState;
  filter: PersonFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const trace = useKinshipTrace(rawGraph, graph);

  const applyFilterToUrl = useCallback(
    (next: PersonFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isEmptyFilter(next)) params.delete("filter");
      else params.set("filter", JSON.stringify(next));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const mergedHighlight = useMemo(
    () =>
      trace.traceHighlight
        ? { ...highlight, ...trace.traceHighlight }
        : highlight,
    [highlight, trace.traceHighlight],
  );

  const kinshipContext = useMemo(
    () => ({
      isPicking: trace.pickSlot !== null,
      pick: trace.pick,
      compareWith: trace.compareWith,
    }),
    [trace.pickSlot, trace.pick, trace.compareWith],
  );

  // A person with no recorded relationship at all (layout/types.ts's
  // NormalizedPerson.isIsolated) is still placed on the canvas — as a
  // connector-less card in a row below the tree (see placeIsolatedPersons,
  // subtree.ts) — rather than crashing the page (the bug this UI hint was
  // added for). Surfaced here so a family member notices "not yet linked"
  // people instead of assuming the tree is complete.
  const isolatedCount = useMemo(
    () => graph.nodes.filter((n) => n.isIsolated).length,
    [graph.nodes],
  );

  return (
    <KinshipProvider value={kinshipContext}>
      <TreeCanvas
        graph={graph}
        rawGraph={rawGraph}
        familyId={familyId}
        familySlug={familySlug}
        highlight={mergedHighlight}
        onOpenFilter={() => setFilterPanelOpen(true)}
        isFilterActive={!isEmptyFilter(filter)}
        toolbarExtra={<KinshipButton trace={trace} />}
        overlay={<KinshipPanel trace={trace} familyId={familyId} />}
      />

      <TreeFilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        filter={filter}
        onApply={applyFilterToUrl}
      />

      {isolatedCount > 0 && (
        // top-center, not bottom-center — that spot is the "Инструменты" /
        // "Родство" bar (tree-tools-menu.tsx) rendered inside TreeCanvas.
        <div
          className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md"
          role="status"
        >
          {isolatedCount === 1
            ? "1 человек не привязан к дереву"
            : `${isolatedCount} человек не привязаны к дереву`}
        </div>
      )}
    </KinshipProvider>
  );
}
