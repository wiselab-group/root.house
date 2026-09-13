"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { personInitials } from "@/domain/person/display-name";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import { CompactCardBody } from "./compact-card-body";
import { PortraitCardBody } from "./portrait-card-body";
import {
  buildCardFrameClassName,
  CollapseBadge,
  InvisibleConnectorHandles,
  personLabel,
  selectedCardBoxShadow,
  yearRange,
} from "./person-node-parts";
import { PersonNodePopoverActions } from "./person-node-popover-actions";

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
 *
 * Also carries the collapse/expand "+N" badge (rewrite plan §7 Stage 5, see
 * person-node-parts.tsx's CollapseBadge) — floating at the card's own
 * bottom-center, outside the popover trigger so a click there toggles
 * collapse state instead of opening the profile menu. Only rendered when
 * `data.hasChildren` is true, which xyflow-adapter.ts sets to false for a
 * person whose every child is already covered by a UNION badge instead (see
 * union-collapse-badge.tsx) — a partnered couple with shared children gets
 * ONE badge on their partnership line, never one per card.
 */
export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const name = personLabel(data);
  const years = yearRange(data);
  const initials = personInitials(data);

  const isDimmed = data.isFilterMatch === false || data.isOnTracePath === false;
  // The focus person can itself be one end of an active trace (isOnTracePath
  // true) — it still stays on the sage identity color, not terracotta, so
  // this excludes isFocus explicitly rather than just checking isOnTracePath.
  const isTraceHighlighted = data.isOnTracePath === true && !data.isFocus;

  const cardBody = (
    <>
      <InvisibleConnectorHandles />
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
          isFocus={data.isFocus}
          isTraced={isTraceHighlighted}
          isSelected={selected}
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

  const cardFrameClassName = buildCardFrameClassName({
    cardStyle: data.cardStyle,
    isFocus: data.isFocus,
    isTraced: isTraceHighlighted,
    isPlaceholder: data.isPlaceholder,
    isDimmed,
    readOnly: Boolean(data.readOnly),
  });
  const cardFrameStyle = {
    // Entrance stagger, per DESIGN.md's "смена focus-person — stagger
    // пропорционально расстоянию от нового focus" — a full page navigation
    // replaces the whole node set (no shared identity across the old/new
    // layout for XYFlow to interpolate positions between), so the honest
    // version of that spec is staggering how each node enters the new
    // layout, not sliding it from its old position.
    animationDelay: `${Math.min(Math.abs(data.generation), 4) * 60}ms`,
    boxShadow: selectedCardBoxShadow({
      cardStyle: data.cardStyle,
      isSelected: Boolean(selected),
      isTraced: isTraceHighlighted,
    }),
  };

  // Collapse/expand (rewrite plan §7 Stage 5) — only rendered when this
  // person actually has a child to hide (hasChildren) AND a toggle handler
  // exists (never in read-only mode — see xyflow-adapter.ts). Shows "+N"
  // once collapsed (collapsedDescendantCount set by prune-collapsed.ts);
  // shows a plain "−" affordance while expanded, so there's always a
  // visible way back in either state, not just a badge that vanishes once
  // clicked.
  const collapseBadge =
    data.hasChildren && data.onToggleCollapse ? (
      <CollapseBadge
        personId={data.personId}
        collapsedDescendantCount={data.collapsedDescendantCount}
        onToggleCollapse={data.onToggleCollapse}
      />
    ) : null;

  // Read-only (Share Link) view: no popover at all — both of its actions
  // are already suppressed for readOnly (see PersonNodePopoverActions'
  // own doc comment), so wrapping the card in a Popover/PopoverTrigger
  // would only ever open an empty panel on click. A plain non-interactive
  // div renders the exact same card body with no click affordance.
  const cardFrame = data.readOnly ? (
    <div className={cardFrameClassName} style={cardFrameStyle}>
      {cardBody}
    </div>
  ) : (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={<div className={cardFrameClassName} style={cardFrameStyle} />}
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

  return (
    <div className="relative">
      {cardFrame}
      {collapseBadge}
    </div>
  );
}
