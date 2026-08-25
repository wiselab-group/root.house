import type { Node, Edge } from "@xyflow/react";
import type {
  TreeLayoutGraph,
  LayoutNode,
} from "@/domain/tree/tree-layout.builder";
import type { TreeCardStyle } from "../use-tree-card-style";

/**
 * The ONLY module in the codebase allowed to import @xyflow/react types.
 * Converts the library-agnostic TreeLayoutGraph (domain/tree/tree-layout.builder.ts)
 * into XYFlow's Node/Edge shapes. If we ever swap graph-viz libraries, this
 * file (plus tree-canvas.tsx) is the only place that changes — the domain
 * layer and database are untouched.
 */

export interface PersonNodeData extends Record<string, unknown> {
  personId: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  photoMediaId: string | null;
  /** Needed alongside photoMediaId to build the /api/media/[id] URL — every
   *  photo request is family-scoped (see media.service.ts), so the node
   *  can't fetch its own avatar without knowing which family it belongs to. */
  familyId: string;
  isFocus: boolean;
  generation: number;
  cardStyle: TreeCardStyle;
  /** Filter/Focus layer (tree-filter.ts) — true once a filter is active and this person matches it. Undefined when no filter is active at all. */
  isFilterMatch?: boolean;
  /** Relationship Trace (tree-trace.ts) — true while this person is on the currently traced A-to-B path. */
  isOnTracePath?: boolean;
}

export interface RelationshipEdgeData extends Record<string, unknown> {
  isCurrent: boolean;
  /** Relationship Trace (tree-trace.ts) — true while this edge is a hop on the currently traced A-to-B path. */
  isOnTracePath?: boolean;
}

export type PersonFlowNode = Node<PersonNodeData, "person">;
export type RelationshipFlowEdge = Edge<RelationshipEdgeData, "parentChild" | "partnership">;

/**
 * Optional per-node/edge highlight state, computed by the Filter/Focus
 * (tree-filter.ts) and Relationship Trace (tree-trace.ts) layers. Passed
 * separately from `graph` (rather than requiring FilteredTreeLayoutGraph /
 * TracedTreeLayoutGraph as the input type) so toReactFlow keeps accepting a
 * plain TreeLayoutGraph — every existing caller with no filter/trace active
 * is unaffected.
 */
export interface TreeHighlightState {
  /** Present (even if empty) once a filter is active; absent means "no filter" (isFilterMatch stays undefined on every node). */
  filterMatchedIds?: Set<string>;
  tracePersonIds?: Set<string>;
  traceEdgeIds?: Set<string>;
}

// Node dimensions per card style — must match what PersonNode actually
// renders at (see its w-*/h-* classes). Server-side layout (tree-layout.builder.ts)
// only ever computes the "compact" spacing (SIBLING_X_SPACING/GENERATION_Y_SPACING,
// 244/180); the "portrait" style rescales those same x/y values proportionally
// below rather than asking the server to lay out twice — this is purely a
// client-side viewing preference (see use-tree-card-style.ts), not something
// that needs its own domain-layer layout pass.
const COMPACT_X_SPACING = 244;
const COMPACT_Y_SPACING = 180;
const PORTRAIT_X_SPACING = 184;
const PORTRAIT_Y_SPACING = 260;

const NODE_DIMENSIONS: Record<
  TreeCardStyle,
  { width: number; height: number }
> = {
  compact: { width: 220, height: 88 },
  portrait: { width: 160, height: 220 },
};

function toFlowNode(
  node: LayoutNode,
  familyId: string,
  cardStyle: TreeCardStyle,
  highlight: TreeHighlightState,
): PersonFlowNode {
  const xScale =
    cardStyle === "portrait" ? PORTRAIT_X_SPACING / COMPACT_X_SPACING : 1;
  const yScale =
    cardStyle === "portrait" ? PORTRAIT_Y_SPACING / COMPACT_Y_SPACING : 1;

  return {
    id: node.id,
    type: "person",
    position: { x: node.x * xScale, y: node.y * yScale },
    data: {
      personId: node.person.id,
      firstName: node.person.firstName,
      lastName: node.person.lastName,
      nickname: node.person.nickname,
      isPlaceholder: node.person.isPlaceholder,
      isLiving: node.person.isLiving,
      birthYear: node.person.birthYear,
      deathYear: node.person.deathYear,
      photoMediaId: node.person.photoMediaId,
      familyId,
      isFocus: node.isFocus,
      generation: node.generation,
      cardStyle,
      isFilterMatch: highlight.filterMatchedIds ? highlight.filterMatchedIds.has(node.id) : undefined,
      isOnTracePath: highlight.tracePersonIds ? highlight.tracePersonIds.has(node.id) : undefined,
    },
    // XYFlow needs explicit dimensions before layout/fitView math is
    // reliable; matches the fixed size PersonNode renders each style at.
    ...NODE_DIMENSIONS[cardStyle],
  };
}

function toFlowEdges(graph: TreeLayoutGraph, highlight: TreeHighlightState): RelationshipFlowEdge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    type: edge.kind === "partnership" ? "partnership" : "parentChild",
    source: edge.source,
    target: edge.target,
    // Partnership edges (spouse) are visually distinct (dashed) from
    // parent_child edges (solid) — see tree-canvas.tsx edge styling.
    data: {
      isCurrent: edge.isCurrent ?? true,
      isOnTracePath: highlight.traceEdgeIds ? highlight.traceEdgeIds.has(edge.id) : undefined,
    },
  }));
}

export function toReactFlow(
  graph: TreeLayoutGraph,
  familyId: string,
  cardStyle: TreeCardStyle,
  highlight: TreeHighlightState = {},
): { nodes: PersonFlowNode[]; edges: RelationshipFlowEdge[] } {
  return {
    nodes: graph.nodes.map((node) => toFlowNode(node, familyId, cardStyle, highlight)),
    edges: toFlowEdges(graph, highlight),
  };
}
