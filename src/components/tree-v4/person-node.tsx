"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { LaidOutPerson } from "@/domain/tree-v4/types";

/**
 * xyflow requires node.data ⊆ Record<string, unknown> — LaidOutPerson
 * (domain) intentionally lacks that index signature (domain doesn't know
 * about React Flow), so this wrapper adds it only at the view layer.
 */
export interface PersonNodeData extends Record<string, unknown> {
  person: LaidOutPerson;
  isFocus: boolean;
}

export type PersonFlowNode = Node<PersonNodeData, "person">;

/**
 * tree-v4 Person card. Visual language (border/bg-card/shadow, font-heading)
 * reuses the project's existing design tokens (CLAUDE.md DESIGN TOKENS) —
 * this task's focus is the layout engine, not a UI redesign.
 *
 * Handles are invisible plumbing only — edges draw their own SVG geometry
 * from data.* coordinates coming out of the domain edge specs, not from
 * xyflow's own handle position (default handles sit a few px inset from the
 * true card edge). They exist purely so React Flow doesn't warn about an
 * edge referencing a missing handle id.
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
