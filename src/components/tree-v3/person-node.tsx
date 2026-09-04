"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { LaidOutPerson } from "@/domain/tree-v3/types";

/**
 * xyflow требует node.data ⊆ Record<string, unknown> (index signature) —
 * LaidOutPerson (domain) намеренно НЕ имеет её (domain не знает о React
 * Flow, §48) — эта обёртка добавляет её только во view-слое, тот же паттерн,
 * что и tree-v2/person-node.tsx::PersonNodeData.
 */
export interface PersonNodeData extends Record<string, unknown> {
  person: LaidOutPerson;
  isFocus: boolean;
}

export type PersonFlowNode = Node<PersonNodeData, "person">;

/**
 * tree-v3 — карточка персоны. Визуальный язык (border/bg-card/shadow,
 * font-heading) взят из тех же CSS-переменных, что и tree-v2/боевое дерево
 * (CLAUDE.md DESIGN TOKENS) — §36 задачи: reuse существующий card design,
 * фокус этой задачи — layout engine, не визуальный редизайн.
 *
 * Handle'ы на всех 4 сторонах, невидимые (opacity-0) — edges (partnership-
 * edge.tsx, parent-child-edge.tsx) игнорируют их фактическую CSS-позицию и
 * рисуют геометрию сами из data.* координат (см. комментарий в tree-canvas
 * про 3px inset у default-handle) — Handle-элементы здесь нужны только чтобы
 * React Flow не ругался на edges без соответствующего handle id.
 */
export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { person, isFocus } = data;
  const name = `${person.firstName} ${person.lastName}`.trim();

  return (
    <div
      className={cn(
        "flex size-44 flex-col items-center justify-center gap-1 rounded-lg border bg-card px-3 text-center shadow-sm",
        "font-heading text-sm text-card-foreground",
        isFocus ? "border-primary ring-2 ring-primary/30" : "border-border",
      )}
    >
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="opacity-0!"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
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
      <span>{name}</span>
      {person.branch !== "unknown" && (
        <span className="text-xs text-muted-foreground">
          {branchLabel(person.branch)}
        </span>
      )}
    </div>
  );
}

function branchLabel(branch: LaidOutPerson["branch"]): string {
  switch (branch) {
    case "focus":
      return "фокус";
    case "paternal":
      return "по отцу";
    case "maternal":
      return "по матери";
    case "descendant":
      return "потомок";
    default:
      return "";
  }
}
