"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FilterIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PersonPickerDialog } from "./person-picker-dialog";
import { TreeFilterPanel } from "./tree-filter-panel";
import { isEmptyFilter, type PersonFilter } from "@/domain/tree/tree-filter";
import type { RelationshipPathOutcome } from "@/domain/relationship/genealogy-algorithms";

type Picker = "traceA" | "traceB" | null;

/**
 * Toolbar sitting above/beside the Tree Canvas — Search + Relationship Trace
 * + Filter (plan §16-17). Deliberately outside tree-canvas.tsx: this
 * component only writes URL params (?traceA=, ?traceB=, ?filter=) and reads
 * back already-computed data passed in as props from the Server Component
 * page — it contains no genealogy logic itself, matching the plan's "search
 * logic must not live inside Tree Canvas".
 */
export function TreeToolbar({
  familyId,
  traceA,
  traceB,
  traceOutcome,
  filter,
}: {
  familyId: string;
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpenPicker("traceA")}>
        <SearchIcon />
        {traceA ? traceA.name : "Человек A"}
      </Button>
      <span className="text-sm text-muted-foreground">→</span>
      <Button variant="outline" size="sm" onClick={() => setOpenPicker("traceB")}>
        <SearchIcon />
        {traceB ? traceB.name : "Человек B"}
      </Button>

      {(traceA || traceB) && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Сбросить сравнение родства"
          onClick={() => {
            setParam("traceA", null);
            setParam("traceB", null);
          }}
        >
          <XIcon />
        </Button>
      )}

      {traceLabel && <Badge variant="secondary">{traceLabel}</Badge>}

      <Button
        variant={isEmptyFilter(filter) ? "outline" : "default"}
        size="sm"
        className="ml-auto"
        onClick={() => setFilterPanelOpen(true)}
      >
        <FilterIcon />
        Фильтр
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
    </div>
  );
}

function describeTraceOutcome(outcome: RelationshipPathOutcome | null): string | null {
  if (!outcome) return null;
  if (outcome.status !== "found") {
    return outcome.status === "insufficient_data" ? "Недостаточно данных" : "Родство не найдено";
  }
  if (outcome.relationship.label === "same person") return "Один и тот же человек";
  return RELATIONSHIP_LABELS[outcome.relationship.label] ?? outcome.relationship.label;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: "Родитель",
  child: "Ребёнок",
  sibling: "Брат/сестра",
  grandparent: "Дедушка/бабушка",
  grandchild: "Внук/внучка",
  aunt_or_uncle: "Тётя/дядя",
  niece_or_nephew: "Племянник/племянница",
  cousin: "Кузен/кузина",
  unrelated: "Родство не найдено",
};
