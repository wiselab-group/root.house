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
 * The collapse/expand "+N" / "−" button itself — shared, unpositioned
 * visual, so PersonNode's per-card badge (CollapseBadge below) and the
 * per-union badge rendered on a partnership line's own midpoint
 * (union-collapse-badge.tsx) read as the exact same control regardless of
 * which one a given branch happens to get (see xyflow-adapter.ts's
 * personIdsNeedingOwnBadge/findUnionsWithChildren for which branches get
 * which). Callers own their own positioning wrapper — this component only
 * renders the button, un-positioned. `nodrag`/`nopan` (XYFlow's own
 * escape-hatch classes, see its docs) keep a click here from starting a
 * canvas drag or panning the viewport; stopPropagation keeps it from also
 * bubbling into whatever's underneath (a card's click-to-open-popover, or —
 * for the union badge — nothing, but kept for the same defensive reason).
 */
export function CollapseToggleButton({
  collapsedDescendantCount,
  onToggle,
  className,
}: {
  collapsedDescendantCount: number | undefined;
  onToggle: () => void;
  className?: string;
}) {
  const isCollapsed = collapsedDescendantCount !== undefined;
  return (
    <button
      type="button"
      className={cn(
        "nodrag nopan z-10 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border bg-card px-1.5 text-[0.65rem] font-medium shadow-sm transition-colors",
        // Sage (--tree-accent), not terracotta — "collapsed" is a standing
        // property of this branch (identity/state), not something the user
        // is doing right now, so it follows the identity color, not the
        // action color (see buildCardFrameClassName's own comment on that
        // split).
        isCollapsed
          ? "border-tree-accent text-tree-accent hover:bg-tree-accent/10"
          : "border-border text-muted-foreground opacity-60 hover:opacity-100 focus-visible:opacity-100",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
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
 * "+N" / "−" collapse toggle, floating at the card's own bottom-center — the
 * one place a parent_child connector line already runs, so the badge reads
 * as "there's more of the tree hanging off this line" rather than a random
 * floating control. Only rendered on a card when NO union badge already
 * covers this person's children (see xyflow-adapter.ts's
 * personIdsNeedingOwnBadge) — a person with a partnered union with shared
 * children gets that union's own badge on the partnership line instead (see
 * union-collapse-badge.tsx), never both.
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
  return (
    <CollapseToggleButton
      collapsedDescendantCount={collapsedDescendantCount}
      onToggle={() => onToggleCollapse(personId)}
      className="absolute left-1/2 -bottom-2.5 -translate-x-1/2"
    />
  );
}

/**
 * PersonNode's own outer card-frame className — split out purely to keep
 * that file's render body short (CLAUDE.md's 150-line component limit).
 * "compact" cardStyle has NO card frame at all — the round avatar itself
 * carries the border/ring states (see compact-card-body.tsx's own
 * isFocus/isTraced/isSelected/isPlaceholder handling) so the parent_child
 * connector line, anchored to this div's own top/bottom edges via
 * InvisibleConnectorHandles, visibly touches the avatar instead of stopping
 * at an invisible card boundary.
 *
 * Color roles (see globals.css's own comment): sage (--tree-accent) reads as
 * this person's own identity — a permanent border on every card, the same
 * flat shade regardless of generation. The focus person keeps that same
 * sage identity border, just emphasized with a second ring. Keyboard
 * selection (isSelected) stays terracotta (it's a "what you're doing right
 * now" state, same family as Relationship Trace) but now uses that same
 * double-ring shape instead of the single flat `ring-ring` it used to have —
 * a plain single ring read as a weaker, different-looking signal than
 * focus/trace's double ring instead of a clearly equivalent kind of
 * emphasis; requested by the user. Drawn as an explicit box-shadow rather
 * than stacked Tailwind `ring-*` utilities because a card can only carry one
 * `ring` utility at a time, and this needs two rings (3px solid + 6px
 * translucent) independent of the sage border underneath. The sage border
 * is deliberately ONE color for every card — no per-generation fade — so
 * "sage border" reads as a single consistent signal across the whole tree,
 * not a gradient to decode.
 */
export function buildCardFrameClassName({
  cardStyle,
  isFocus,
  isTraced,
  isPlaceholder,
  isDimmed,
  readOnly,
}: {
  cardStyle: PersonFlowNode["data"]["cardStyle"];
  isFocus: boolean;
  isTraced: boolean;
  isPlaceholder: boolean;
  isDimmed: boolean;
  readOnly: boolean;
}): string {
  return cn(
    "w-40 origin-center",
    "animate-tree-node-enter",
    "transition-[opacity,box-shadow] duration-200 ease-(--ease-tree-focus)",
    cardStyle === "compact"
      ? "overflow-visible"
      : cn(
          "overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md",
          isTraced
            ? "border-primary ring-2 ring-primary/30"
            : "border-tree-accent",
          isFocus && !isTraced && "ring-2 ring-tree-accent/30",
          // isSelected gets its own explicit box-shadow (selectedCardBoxShadow
          // below) instead of a ring-* utility here — see this function's own
          // doc comment on why (a card can only carry one `ring` utility, and
          // isTraced/isFocus already claim it).
          isPlaceholder && "border-dashed opacity-70",
        ),
    isDimmed && "opacity-35 hover:opacity-70",
    !readOnly && "cursor-pointer",
  );
}

/**
 * isSelected's terracotta double-ring box-shadow for the "portrait" card
 * frame (see buildCardFrameClassName's own doc comment) — undefined when it
 * doesn't apply, so callers can spread it into their existing style object
 * without an empty boxShadow key colliding with cardStyle "compact" (which
 * draws its own selected ring on the avatar instead, see
 * compact-card-body.tsx). isTraced always wins over isSelected, matching
 * buildCardFrameClassName's own precedence.
 */
export function selectedCardBoxShadow({
  cardStyle,
  isSelected,
  isTraced,
}: {
  cardStyle: PersonFlowNode["data"]["cardStyle"];
  isSelected: boolean;
  isTraced: boolean;
}): string | undefined {
  if (cardStyle !== "portrait" || !isSelected || isTraced) return undefined;
  return "0 0 0 3px var(--ring), 0 0 0 6px color-mix(in oklch, var(--ring) 30%, transparent)";
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
