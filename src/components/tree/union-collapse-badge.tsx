"use client";

import { EdgeLabelRenderer } from "@xyflow/react";
import { CollapseToggleButton } from "./person-node-parts";

/**
 * union-collapse-badge.tsx — collapse/expand on a shared union (rewrite plan
 * §7 Stage 5 follow-up, user-requested 2026-09-12).
 *
 * When a couple shares at least one recorded child, the collapse/expand
 * toggle for THAT couple's descendants moves off both individual cards and
 * onto the partnership line's own midpoint instead — the one place their
 * shared trunk line (union-child-edge.tsx) actually starts. Rationale: the
 * children below a union belong to BOTH parents, not to whichever one
 * happens to render the badge first — a per-card badge on only one of them
 * reads as "this branch belongs to this parent alone", which isn't true.
 * Putting it on the union itself also removes the arbitrary "which parent's
 * card gets it" question and — for a person with multiple marriages
 * (rewrite plan's alternating-spouses layout) — gives each marriage its OWN
 * independent toggle, keyed by that marriage's own partnershipEdgeId (see
 * prune-collapsed.ts's `union:<partnershipEdgeId>` collapse key), instead of
 * one shared per-person toggle that would incorrectly hide every marriage's
 * children at once.
 *
 * Rendered from PartnershipEdgeLine (relationship-edge.tsx) via
 * `EdgeLabelRenderer` — XYFlow's own escape hatch for HTML content that
 * needs to sit at a specific point in FLOW coordinates while still tracking
 * the viewport's own pan/zoom transform, exactly what a plain absolutely
 * positioned `<div>` outside the flow's transformed layer could not do
 * without reimplementing that transform by hand.
 */
export function UnionCollapseBadge({
  x,
  y,
  collapsedDescendantCount,
  collapseKey,
  onToggleCollapse,
}: {
  /** Midpoint between the two partners' cards, in flow (not screen) coordinates — same point PartnershipEdgeLine's own line passes through. */
  x: number;
  y: number;
  collapsedDescendantCount: number | undefined;
  collapseKey: string;
  onToggleCollapse: (collapseKey: string) => void;
}) {
  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          pointerEvents: "all",
        }}
      >
        <CollapseToggleButton
          collapsedDescendantCount={collapsedDescendantCount}
          onToggle={() => onToggleCollapse(collapseKey)}
        />
      </div>
    </EdgeLabelRenderer>
  );
}
