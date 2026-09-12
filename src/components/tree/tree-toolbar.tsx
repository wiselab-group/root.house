"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FilterIcon, RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TreeCanvas } from "./tree-canvas";
import { TreeFilterPanel } from "./tree-filter-panel";
import { TreeTracePanel } from "./tree-trace-panel";
import { isEmptyFilter, type PersonFilter } from "@/domain/tree/tree-filter";
import { describeTraceOutcome } from "./describe-trace-outcome";
import type { RelationshipPathOutcome } from "@/domain/relationship/genealogy-algorithms";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import type { TreeClientGraphPayload } from "@/domain/tree/tree-adapter";
import type { TreeHighlightState } from "./adapters/xyflow-adapter";

/**
 * Wraps TreeCanvas with Relationship Trace + Filter (plan §16-17): both are
 * floating round buttons overlaying the canvas — Trace top-left, Filter
 * top-right — sharing the exact same Button styling so the two read as one
 * matched pair of app-level tools, not one native-canvas control (zoom,
 * card style) and one bolted-on app control. Neither eats into the canvas's
 * vertical space, matching how the canvas is full-bleed on mobile.
 *
 * The trace button opens TreeTracePanel, which shows both Person A and
 * Person B slots at once as inline search-as-you-type comboboxes (each
 * independently pickable/clearable) rather than silently jumping straight
 * to whichever slot happens to be empty, or bouncing through a separate
 * picker dialog.
 *
 * Writes URL params (?traceA=, ?traceB=, ?filter=) and reads back
 * already-computed data passed in as props from the Server Component page —
 * contains no genealogy logic itself, matching the plan's "search logic
 * must not live inside Tree Canvas" (the logic lives in domain/tree/*; this
 * is just the UI that triggers it).
 */
export function TreeToolbar({
  familyId,
  familySlug,
  graph,
  rawGraph,
  highlight,
  traceA,
  traceB,
  traceOutcome,
  filter,
}: {
  familyId: string;
  /** The family's URL slug — threaded down to TreeCanvas for each card's click-popover profile link. */
  familySlug: string;
  graph: TreeLayoutGraph;
  /** Rewrite plan §7 Stage 7 — the client-safe raw graph (getRawTreeGraph), passed through so TreeCanvas can re-run buildTreeLayout locally on focus switch instead of a full page reload. Undefined in read-only (Share Link) contexts, which never render TreeToolbar at all. */
  rawGraph: TreeClientGraphPayload;
  highlight?: TreeHighlightState;
  traceA: { id: string; name: string } | null;
  traceB: { id: string; name: string } | null;
  traceOutcome: RelationshipPathOutcome | null;
  filter: PersonFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tracePanelOpen, setTracePanelOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) params.delete(key);
      else params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const applyFilterToUrl = useCallback(
    (next: PersonFilter) => {
      setParam("filter", isEmptyFilter(next) ? null : JSON.stringify(next));
    },
    [setParam],
  );

  // Clears both trace slots in one navigation — calling setParam twice in a
  // row would have the second call's URLSearchParams snapshot miss the
  // first's still-in-flight update, silently reviving traceA/traceB.
  const resetTrace = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("traceA");
    params.delete("traceB");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const traceLabel = useMemo(
    () => describeTraceOutcome(traceOutcome),
    [traceOutcome],
  );
  const isTraceActive = Boolean(traceA || traceB);

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
    <>
      <TreeCanvas
        graph={graph}
        rawGraph={rawGraph}
        familyId={familyId}
        familySlug={familySlug}
        highlight={highlight}
      />

      <Button
        variant={isTraceActive ? "default" : "outline"}
        size="icon"
        aria-label="Сравнить родство двух людей"
        className="absolute top-3 left-3 z-10 rounded-full shadow-md"
        onClick={() => setTracePanelOpen(true)}
      >
        <RouteIcon />
      </Button>

      <Button
        variant={isEmptyFilter(filter) ? "outline" : "default"}
        size="icon"
        aria-label="Фильтр"
        className="absolute top-3 right-3 z-10 rounded-full shadow-md"
        onClick={() => setFilterPanelOpen(true)}
      >
        <FilterIcon />
      </Button>

      <TreeTracePanel
        open={tracePanelOpen}
        onOpenChange={setTracePanelOpen}
        familyId={familyId}
        traceA={traceA}
        traceB={traceB}
        traceLabel={traceLabel}
        onSelectSlot={(slot, person) => setParam(slot, person?.id ?? null)}
        onReset={resetTrace}
      />

      <TreeFilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        filter={filter}
        onApply={applyFilterToUrl}
      />

      {isolatedCount > 0 && (
        <div
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md"
          role="status"
        >
          {isolatedCount === 1
            ? "1 человек не привязан к дереву"
            : `${isolatedCount} человек не привязаны к дереву`}
        </div>
      )}
    </>
  );
}
