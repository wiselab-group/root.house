"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
 * Wraps TreeCanvas with Relationship Trace + Filter (plan §16-17). Neither
 * renders its own floating button anymore (2026-09-18 — previously two
 * round buttons, Trace top-left/Filter top-right) — both are now rows
 * inside TreeCanvas's own "Инструменты" popover (tree-tools-menu.tsx),
 * alongside card style/drag-lock/fit-view, per direct user request to
 * collapse every tree-viewing tool into one entry point. This component
 * still owns the two dialogs (TreeTracePanel/TreeFilterPanel) and their
 * open state — it hands TreeCanvas a callback to open each one instead of
 * rendering a trigger button itself.
 *
 * Writes URL params (?traceA=, ?traceB=, ?filter=) and reads back
 * already-computed data passed in as props — contains no genealogy logic
 * itself (that lives in domain/tree/*), just the UI that triggers it.
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
        onOpenTrace={() => setTracePanelOpen(true)}
        onOpenFilter={() => setFilterPanelOpen(true)}
        isTraceActive={isTraceActive}
        isFilterActive={!isEmptyFilter(filter)}
      />
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
        // top-center, not bottom-center — that spot is now the "Инструменты"
        // menu button (tree-tools-menu.tsx) rendered inside TreeCanvas; this
        // moved up here once Trace/Filter's own top-corner buttons were
        // removed and freed the space.
        <div
          className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md"
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
