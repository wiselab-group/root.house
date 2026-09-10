"use client";

import { Handle, Position } from "@xyflow/react";
import { PlusIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";

/**
 * person-node-parts.tsx — small pieces split out of person-node.tsx purely
 * to keep that file under CLAUDE.md's 150-line component limit (collapse/
 * expand, rewrite plan §7 Stage 5, pushed it over). No shared state or
 * behavior beyond what each component's own props already carry.
 */

/**
 * The top/left/right connector handles, invisible (opacity-0) — Relationship
 * Edge/UnionChildEdge compute every edge's actual geometry themselves from
 * live node positions (see relationship-edge.tsx, union-child-edge.tsx), not
 * from where a handle's own CSS anchor sits, so XYFlow's default visible dot
 * no longer means anything to point at. `top` still needs to exist and keep
 * its id — plain parent_child edges (no shared union trunk) still anchor to
 * it via sourceHandle/targetHandle in xyflow-adapter.ts. left/right have no
 * remaining consumer but stay for layout symmetry / a future direct anchor.
 * `bottom` is NOT here — PersonNode renders it itself, after its card body,
 * so its DOM position stays below the body content in source order (handle
 * placement is CSS-absolute either way, but keeping it there matches the
 * existing top-then-body-then-bottom reading order).
 */
export function InvisibleConnectorHandles() {
  return (
    <>
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="opacity-0!"
      />
      <Handle
        type="source"
        id="left"
        position={Position.Left}
        className="opacity-0!"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="opacity-0!"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="opacity-0!"
      />
      <Handle
        type="target"
        id="right"
        position={Position.Right}
        className="opacity-0!"
      />
    </>
  );
}

/**
 * "+N" / "−" collapse toggle, floating at the card's own bottom-center — the
 * one place a parent_child connector line already runs, so the badge reads
 * as "there's more of the tree hanging off this line" rather than a random
 * floating control. `nodrag`/`nopan` (XYFlow's own escape-hatch classes, see
 * its docs) keep a click here from starting a canvas drag or panning the
 * viewport; stopPropagation keeps it from also bubbling into the card's own
 * click-to-open-popover behavior underneath.
 */
export function CollapseBadge({
  personId,
  collapsedDescendantCount,
  onToggleCollapse,
}: {
  personId: string;
  collapsedDescendantCount: number | undefined;
  onToggleCollapse: (personId: string) => void;
}) {
  const isCollapsed = collapsedDescendantCount !== undefined;
  return (
    <button
      type="button"
      className={cn(
        "nodrag nopan absolute left-1/2 -bottom-2.5 z-10 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center gap-0.5 rounded-full border bg-card px-1.5 text-[0.65rem] font-medium shadow-sm transition-colors",
        isCollapsed
          ? "border-primary text-primary hover:bg-primary/10"
          : "border-border text-muted-foreground opacity-60 hover:opacity-100 focus-visible:opacity-100",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggleCollapse(personId);
      }}
      aria-label={
        isCollapsed
          ? `Показать ${collapsedDescendantCount} скрытых потомков`
          : "Свернуть потомков"
      }
      title={
        isCollapsed
          ? `Показать ${collapsedDescendantCount} скрытых потомков`
          : "Свернуть потомков"
      }
    >
      {isCollapsed ? (
        <>
          <PlusIcon className="size-3" />
          {collapsedDescendantCount}
        </>
      ) : (
        <MinusIcon className="size-3" />
      )}
    </button>
  );
}

/**
 * PersonNode's own outer card-frame className — split out purely to keep
 * that file's render body short (CLAUDE.md's 150-line component limit).
 * "compact" cardStyle has NO card frame at all — the round avatar itself
 * carries the border/ring states (see compact-card-body.tsx's own
 * isHighlighted/isSelected/isPlaceholder handling) so the parent_child
 * connector line, anchored to this div's own top/bottom edges via
 * InvisibleConnectorHandles, visibly touches the avatar instead of stopping
 * at an invisible card boundary.
 */
export function buildCardFrameClassName({
  cardStyle,
  isFocusOrTraced,
  isSelected,
  isPlaceholder,
  isDimmed,
  readOnly,
}: {
  cardStyle: PersonFlowNode["data"]["cardStyle"];
  isFocusOrTraced: boolean;
  isSelected: boolean;
  isPlaceholder: boolean;
  isDimmed: boolean;
  readOnly: boolean;
}): string {
  return cn(
    "w-40 origin-center",
    "animate-tree-node-enter",
    "transition-opacity duration-200 ease-(--ease-tree-focus)",
    cardStyle === "compact"
      ? "overflow-visible"
      : cn(
          "overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md",
          isFocusOrTraced ? "border-primary ring-2 ring-primary/30" : "border-border",
          isSelected && "ring-2 ring-ring",
          isPlaceholder && "border-dashed opacity-70",
        ),
    isDimmed && "opacity-35 hover:opacity-70",
    !readOnly && "cursor-pointer",
  );
}

/** Maps a node's generation offset (0 = focus's own generation) to the matching --chart-N token. */
export function generationColor(generation: number): string {
  const distance = Math.min(Math.abs(generation), 4);
  return `var(--chart-${distance + 1})`;
}

export function personLabel(data: PersonFlowNode["data"]): string {
  const parts = [data.firstName, data.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (data.nickname) return data.nickname;
  return data.isPlaceholder ? "Неизвестный родственник" : "Без имени";
}

export function yearRange(data: PersonFlowNode["data"]): string | null {
  if (!data.birthYear && !data.deathYear) return null;
  const birth = data.birthYear ?? "?";
  if (data.isLiving) return `${birth}`;
  return `${birth} — ${data.deathYear ?? "?"}`;
}
