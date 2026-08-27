"use client";

import Link from "next/link";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { UserIcon, FocusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { personInitials } from "@/domain/person/display-name";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
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
 *
 * Clicking a card no longer jumps focus straight away — it opens a small
 * popover with "Посмотреть профиль" (navigates to the Person Profile page)
 * and "Сделать фокус-персоной" (the old click behavior, re-centers the tree
 * on this person). A silent click-to-refocus was too easy to trigger by
 * accident while just browsing the tree; the popover makes both actions
 * explicit and lets a plain click also serve as "read this card" without
 * side effects.
 */
export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const name = personLabel(data);
  const years = yearRange(data);
  const initials = personInitials(data);

  const isDimmed = data.isFilterMatch === false || data.isOnTracePath === false;
  const isTraceHighlighted = data.isOnTracePath === true;

  const cardBody = (
    <>
      {/* Handles are invisible (opacity-0) — RelationshipEdge/UnionChildEdge
       *  compute every edge's actual geometry themselves from live node
       *  positions (see relationship-edge.tsx, union-child-edge.tsx), not
       *  from where a handle's own CSS anchor sits, so XYFlow's default
       *  visible dot no longer means anything to point at. top/bottom still
       *  need to exist and keep their ids — plain parent_child edges (no
       *  shared union trunk) still anchor to them via sourceHandle/
       *  targetHandle in xyflow-adapter.ts. left/right have no remaining
       *  consumer but stay for layout symmetry / a future direct anchor. */}
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
        className="opacity-0!"
      />
    </>
  );

  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "origin-center cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm",
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
              // Entrance stagger, per DESIGN.md's "смена focus-person —
              // stagger пропорционально расстоянию от нового focus" — a full
              // page navigation replaces the whole node set (no shared
              // identity across the old/new layout for XYFlow to interpolate
              // positions between), so the honest version of that spec is
              // staggering how each node enters the new layout, not sliding
              // it from its old position.
              animationDelay: `${Math.min(Math.abs(data.generation), 4) * 60}ms`,
            }}
          />
        }
      >
        {cardBody}
      </PopoverTrigger>
      {/* Narrower than PopoverContent's own w-64 default — two short action
          labels don't need that much width, and a tighter popover reads as
          a quick action menu rather than a panel. p-1 (vs. the default
          p-1.5) keeps a small margin around the items without doubling up
          too much on top of their own px/py. */}
      <PopoverContent className="w-auto min-w-40 p-1">
        <PersonNodePopoverActions data={data} />
      </PopoverContent>
    </Popover>
  );
}

/** The two actions offered by a card's click popover — kept separate from PersonNode so its already-long JSX doesn't grow a third nesting level. */
function PersonNodePopoverActions({
  data,
}: {
  data: PersonFlowNode["data"];
}) {
  return (
    <div className="flex flex-col">
      <PopoverClose
        nativeButton={false}
        render={
          <Link
            href={`/families/${data.familySlug}/people/${data.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.8rem] hover:bg-accent hover:text-accent-foreground"
          />
        }
      >
        <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
        Посмотреть профиль
      </PopoverClose>
      {data.onFocusPerson && (
        <PopoverClose
          render={
            <button
              type="button"
              onClick={() => data.onFocusPerson?.(data.personId)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[0.8rem] hover:bg-accent hover:text-accent-foreground"
            />
          }
        >
          <FocusIcon className="size-3.5 shrink-0 text-muted-foreground" />
          Сделать фокус-персоной
        </PopoverClose>
      )}
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
