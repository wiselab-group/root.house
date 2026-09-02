"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { PersonNodeData } from "@/domain/tree-v2/types";

export type PersonFlowNode = Node<
  PersonNodeData & { isFocus: boolean },
  "person"
>;

/**
 * tree-v2 — минимальная карточка персоны. Никакой поповер-логики, никакого
 * cardStyle-переключателя — только имя и focus-состояние, чтобы было на чём
 * итерировать layout с нуля. Токены дизайна (border/bg-card/shadow) взяты
 * из тех же CSS-переменных, что и боевое дерево (CLAUDE.md DESIGN TOKENS).
 */
export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const name = `${data.firstName} ${data.lastName}`.trim();

  return (
    <div
      className={cn(
        "flex size-40 flex-col items-center justify-center rounded-lg border bg-card px-3 text-center shadow-sm",
        "font-heading text-base text-card-foreground",
        data.isFocus
          ? "border-primary ring-2 ring-primary/30"
          : "border-border",
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
      {name}
    </div>
  );
}
