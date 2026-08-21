"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";

/**
 * Custom XYFlow node rendering a person card. States per DESIGN.md § Person
 * Node states: default / hover / selected / focus-center / dimmed. Dimmed
 * applies to nothing yet (no "irrelevant branch" concept in the MVP focus
 * tree — every visible node is, by construction, within the requested
 * generation range) but the class hook is here for when filtering is added.
 */
export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const name = personLabel(data);
  const years = yearRange(data);

  return (
    <div
      className={cn(
        "w-[200px] rounded-lg border bg-card px-4 py-3 shadow-sm transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        data.isFocus
          ? "border-primary ring-2 ring-primary/30"
          : "border-border",
        selected && "ring-2 ring-ring",
        data.isPlaceholder && "border-dashed opacity-70",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <p className={cn("truncate text-sm font-medium", data.isPlaceholder && "italic text-muted-foreground")}>
        {name}
      </p>
      {years && <p className="text-xs text-muted-foreground">{years}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}

function personLabel(data: PersonFlowNode["data"]): string {
  const parts = [data.firstName, data.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (data.nickname) return data.nickname;
  return data.isPlaceholder ? "Неизвестный родственник" : "Без имени";
}

function yearRange(data: PersonFlowNode["data"]): string | null {
  if (!data.birthYear && !data.deathYear) return null;
  const birth = data.birthYear ?? "?";
  if (data.isLiving) return `${birth}`;
  return `${birth} — ${data.deathYear ?? "?"}`;
}
