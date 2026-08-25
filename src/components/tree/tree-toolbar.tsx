"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FilterIcon, Users2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TreeCanvas } from "./tree-canvas";
import { PersonPickerDialog } from "./person-picker-dialog";
import { TreeFilterPanel } from "./tree-filter-panel";
import { isEmptyFilter, type PersonFilter } from "@/domain/tree/tree-filter";
import { describeTraceOutcome } from "./describe-trace-outcome";
import type { RelationshipPathOutcome } from "@/domain/relationship/genealogy-algorithms";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import type { TreeHighlightState } from "./adapters/xyflow-adapter";

type Picker = "traceA" | "traceB" | null;

/**
 * Wraps TreeCanvas with Relationship Trace + Filter (plan §16-17): both are
 * floating round buttons overlaying the canvas — Trace top-left, Filter
 * top-right — sharing the exact same Button styling so the two read as one
 * matched pair of app-level tools, not one native-canvas control (zoom,
 * card style) and one bolted-on app control. Neither eats into the canvas's
 * vertical space, matching how the canvas is full-bleed on mobile.
 *
 * Writes URL params (?traceA=, ?traceB=, ?filter=) and reads back
 * already-computed data passed in as props from the Server Component page —
 * contains no genealogy logic itself, matching the plan's "search logic
 * must not live inside Tree Canvas" (the logic lives in domain/tree/*; this
 * is just the UI that triggers it).
 */
export function TreeToolbar({
  familyId,
  graph,
  highlight,
  traceA,
  traceB,
  traceOutcome,
  filter,
}: {
  familyId: string;
  graph: TreeLayoutGraph;
  highlight?: TreeHighlightState;
  traceA: { id: string; name: string } | null;
  traceB: { id: string; name: string } | null;
  traceOutcome: RelationshipPathOutcome | null;
  filter: PersonFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openPicker, setOpenPicker] = useState<Picker>(null);
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

  const traceLabel = useMemo(() => describeTraceOutcome(traceOutcome), [traceOutcome]);
  const isTraceActive = Boolean(traceA || traceB);

  return (
    <>
      <TreeCanvas graph={graph} familyId={familyId} highlight={highlight} />

      <Button
        variant={isTraceActive ? "default" : "outline"}
        size="icon"
        aria-label="Сравнить родство двух людей"
        className="absolute top-3 left-3 z-10 rounded-full shadow-md"
        onClick={() => {
          // Both already picked: clicking the trigger again restarts the
          // comparison from Person A rather than doing nothing, since
          // there's no third slot to fill.
          setOpenPicker(traceA && !traceB ? "traceB" : "traceA");
        }}
      >
        <Users2Icon />
      </Button>

      {traceLabel && (
        <button
          type="button"
          onClick={() => {
            setParam("traceA", null);
            setParam("traceB", null);
          }}
          className="absolute top-15 left-3 z-10"
          aria-label="Сбросить сравнение родства"
        >
          <Badge variant="secondary" className="shadow-sm">
            {traceLabel}
            <XIcon />
          </Badge>
        </button>
      )}

      <Button
        variant={isEmptyFilter(filter) ? "outline" : "default"}
        size="icon"
        aria-label="Фильтр"
        className="absolute top-3 right-3 z-10 rounded-full shadow-md"
        onClick={() => setFilterPanelOpen(true)}
      >
        <FilterIcon />
      </Button>

      <PersonPickerDialog
        open={openPicker !== null}
        onOpenChange={(isOpen) => setOpenPicker(isOpen ? openPicker : null)}
        familyId={familyId}
        title={openPicker === "traceA" ? "Выберите человека A" : "Выберите человека B"}
        onSelect={(personId) => setParam(openPicker === "traceA" ? "traceA" : "traceB", personId)}
      />

      <TreeFilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        filter={filter}
        onApply={applyFilterToUrl}
      />
    </>
  );
}
