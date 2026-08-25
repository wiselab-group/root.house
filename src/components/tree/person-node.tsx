"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { personInitials } from "@/domain/person/display-name";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { CompactCardBody } from "./compact-card-body";
import { PortraitCardBody } from "./portrait-card-body";

/**
 * Custom XYFlow node rendering a person card. States per DESIGN.md § Person
 * Node states: default / hover / selected / focus-center / dimmed.
 *
 * Dimmed applies in two cases, both driven by data computed upstream in the
 * domain layer (tree-filter.ts / tree-trace.ts) and passed down through
 * xyflow-adapter.ts — PersonNode itself does no filtering/tracing logic, it
 * only renders the already-decided isFilterMatch/isOnTracePath flags:
 * - a filter is active (isFilterMatch !== undefined) and this person doesn't match it;
 * - a relationship trace is active (isOnTracePath !== undefined) and this person isn't on the traced path.
 * Structure is never destroyed by either — every node stays in the DOM, just
 * at reduced opacity (transform/opacity only, per the animation rules).
 *
 * Renders one of two bodies depending on data.cardStyle (a client-only
 * viewing preference toggled from the canvas's zoom controls, see
 * use-tree-card-style.ts) — "compact" (name+years beside a small avatar,
 * dense enough for many generations at once) or "portrait" (photo-forward,
 * name/years below, for browsing faces). Both share this same outer frame
 * (border/shadow/focus ring/entrance animation) so the two styles read as
 * one consistent tree, not two different components bolted together.
 */
export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const name = personLabel(data);
  const years = yearRange(data);
  const initials = personInitials(data);

  const isDimmed = data.isFilterMatch === false || data.isOnTracePath === false;
  const isTraceHighlighted = data.isOnTracePath === true;

  return (
    <div
      className={cn(
        "origin-center overflow-hidden rounded-lg border bg-card shadow-sm",
        data.cardStyle === "portrait" ? "w-40" : "w-55",
        "animate-tree-node-enter",
        "transition-[transform,box-shadow,opacity] duration-200 ease-(--ease-tree-focus)",
        "hover:-translate-y-0.5 hover:shadow-md",
        data.isFocus || isTraceHighlighted
          ? "border-primary ring-2 ring-primary/30"
          : "border-border",
        selected && "ring-2 ring-ring",
        data.isPlaceholder && "border-dashed opacity-70",
        isDimmed && "opacity-35 hover:opacity-70",
      )}
      style={{
        // Entrance stagger, per DESIGN.md's "смена focus-person — stagger
        // пропорционально расстоянию от нового focus" — a full page
        // navigation replaces the whole node set (no shared identity across
        // the old/new layout for XYFlow to interpolate positions between),
        // so the honest version of that spec is staggering how each node
        // enters the new layout, not sliding it from its old position.
        animationDelay: `${Math.min(Math.abs(data.generation), 4) * 60}ms`,
      }}
    >
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="bg-border!"
      />
      {/* Partnership edges connect sideways (spouses sit side-by-side at the
       *  same generation, see tree-layout.builder.ts's orderByPartnership) —
       *  separate left/right handles so RelationshipEdge can route a
       *  straight horizontal line instead of detouring through the
       *  top/bottom handles meant for parent_child edges. Both sides carry
       *  both handle types since either person in the pair can end up on
       *  either side after layout. */}
      <Handle
        type="source"
        id="left"
        position={Position.Left}
        className="bg-border!"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="bg-border!"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="bg-border!"
      />
      <Handle
        type="target"
        id="right"
        position={Position.Right}
        className="bg-border!"
      />
      {data.cardStyle === "portrait" ? (
        <PortraitCardBody
          data={data}
          name={name}
          years={years}
          initials={initials}
        />
      ) : (
        <CompactCardBody
          data={data}
          name={name}
          years={years}
          initials={initials}
        />
      )}
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="bg-border!"
      />
    </div>
  );
}

/** Maps a node's generation offset (0 = focus's own generation) to the matching --chart-N token. */
export function generationColor(generation: number): string {
  const distance = Math.min(Math.abs(generation), 4);
  return `var(--chart-${distance + 1})`;
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
