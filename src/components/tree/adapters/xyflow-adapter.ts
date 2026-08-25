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
  /**
   * Set on a partnership edge when exactly one partner (not the couple's
   * relationship to each other) is on the traced A-to-B path — e.g. Виктор
   * is on the path to a shared child but Галина isn't, because the path
   * actually runs Виктор → [union trunk] → child, not through the
   * partnership itself (see union-child-edge.tsx). Names that partner's id
   * so PartnershipEdgeLine can color only their half of the dashed line,
   * instead of leaving the whole line looking disconnected from the
   * accent-colored trunk it feeds.
   */
  tracedPartnerId?: string;
}

/**
 * A union-child edge has no real "source" node — its start point is the
 * midpoint of the couple's partnership line, computed live by
 * UnionChildEdge from the two parents' *current* positions (see
 * union-child-edge.tsx) so it stays glued to that line if either card is
 * dragged. parentAId/parentBId name which two person nodes to read.
 */
export interface UnionChildEdgeData extends Record<string, unknown> {
  parentAId: string;
  parentBId: string;
  isOnTracePath?: boolean;
  /**
   * When the trace path reaches this child through only one parent (see
   * RelationshipEdgeData.tracedPartnerId — same idea, same source), naming
   * that parent here lets UnionChildEdge extend its own path all the way
   * back to that parent's own card instead of stopping at the partnership
   * line's midpoint. Drawing it as one continuous <path> (rather than this
   * edge meeting a separately-drawn accent segment of the partnership line
   * at the midpoint) is what gives the corner a clean SVG miter join
   * instead of two independently stroke-capped segments bumping into each
   * other.
   */
  tracedParentId?: string;
}

export type PersonFlowNode = Node<PersonNodeData, "person">;
export type RelationshipFlowEdge = Edge<RelationshipEdgeData, "parentChild" | "partnership">;
export type UnionChildFlowEdge = Edge<UnionChildEdgeData, "unionChild">;
export type TreeFlowEdge = RelationshipFlowEdge | UnionChildFlowEdge;

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

/**
 * A child whose two parents are visible AND partnered gets its trunk line
 * dropped from the midpoint of their partnership line, instead of two
 * separate lines each growing from one parent down to the same child — see
 * union-child-edge.tsx for why (and why that midpoint is computed live from
 * the parents' current positions rather than baked in here).
 *
 * Only fires for exactly-two-parent, mutually-partnered cases: a child with
 * one visible parent, or two parents who aren't partners of each other
 * (e.g. re-marriage), still gets a direct per-parent line — there's no
 * single "couple" to hang a shared trunk from.
 */
function findUnionParentPairs(
  graph: TreeLayoutGraph,
): Map<string, { parentIds: [string, string]; partnershipEdgeId: string }> {
  const partnerPairKey = (a: string, b: string) => [a, b].sort().join("::");
  const partnershipEdgeByPair = new Map<string, string>();
  for (const edge of graph.edges) {
    if (edge.kind === "partnership") {
      partnershipEdgeByPair.set(partnerPairKey(edge.source, edge.target), edge.id);
    }
  }

  const parentsByChild = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "parent_child") continue;
    if (!parentsByChild.has(edge.target)) parentsByChild.set(edge.target, []);
    parentsByChild.get(edge.target)!.push(edge.source);
  }

  const unionByChild = new Map<
    string,
    { parentIds: [string, string]; partnershipEdgeId: string }
  >();
  for (const [childId, parentIds] of parentsByChild) {
    if (parentIds.length !== 2) continue;
    const [a, b] = parentIds;
    const partnershipEdgeId = partnershipEdgeByPair.get(partnerPairKey(a, b));
    if (!partnershipEdgeId) continue;
    unionByChild.set(childId, { parentIds: [a, b], partnershipEdgeId });
  }
  return unionByChild;
}

function toFlowEdges(
  graph: TreeLayoutGraph,
  highlight: TreeHighlightState,
): (RelationshipFlowEdge | UnionChildFlowEdge)[] {
  const unionByChild = findUnionParentPairs(graph);
  const edges: (RelationshipFlowEdge | UnionChildFlowEdge)[] = [];

  for (const edge of graph.edges) {
    const isPartnership = edge.kind === "partnership";

    if (!isPartnership) {
      const union = unionByChild.get(edge.target);
      // This parent's parent_child edge is superseded by a single
      // UnionChildEdge trunk line off the couple's partnership line — see
      // findUnionParentPairs. Only emitted once (off the partnership edge
      // below), not once per parent, so it isn't duplicated here.
      if (union && union.parentIds.includes(edge.source)) continue;

      edges.push({
        id: edge.id,
        type: "parentChild",
        source: edge.source,
        target: edge.target,
        sourceHandle: "bottom",
        targetHandle: "top",
        data: {
          isCurrent: true,
          isOnTracePath: highlight.traceEdgeIds ? highlight.traceEdgeIds.has(edge.id) : undefined,
        },
      });
      continue;
    }

    // A trace path that reaches this couple's shared child runs through
    // one of them (parent → union trunk → child, see union-child-edge.tsx),
    // not through the partnership relationship itself — so isOnTracePath
    // (which only means "this exact edge is a hop on the path") stays
    // false/undefined here, but PartnershipEdgeLine still needs to know
    // which single partner to color half the dashed line for, so that half
    // doesn't look disconnected from the accent-colored trunk it feeds.
    const partneredUnion = [...unionByChild.values()].find((u) => u.partnershipEdgeId === edge.id);
    const tracedPartnerId =
      partneredUnion && highlight.tracePersonIds
        ? partneredUnion.parentIds.find((id) => highlight.tracePersonIds!.has(id))
        : undefined;

    // Partnership edges connect sideways (spouses sit next to each other at
    // the same generation, see tree-layout.builder.ts's orderByPartnership).
    // source/target on the edge itself reflect person1Id/person2Id ordering,
    // not left/right screen position — RelationshipEdge/UnionChildEdge both
    // resolve actual left/right (and the trunk midpoint) from live node
    // positions at render time, not from this ordering.
    edges.push({
      id: edge.id,
      type: "partnership",
      source: edge.source,
      target: edge.target,
      data: {
        isCurrent: edge.isCurrent ?? true,
        isOnTracePath: highlight.traceEdgeIds ? highlight.traceEdgeIds.has(edge.id) : undefined,
        tracedPartnerId,
      },
    });

    // Emit this couple's children's trunk edges right alongside their
    // partnership edge.
    for (const [childId, union] of unionByChild) {
      if (union.partnershipEdgeId !== edge.id) continue;
      const childIsOnTracePath = highlight.traceEdgeIds
        ? highlight.traceEdgeIds.has(`pc-${union.parentIds[0]}-${childId}`) ||
          highlight.traceEdgeIds.has(`pc-${union.parentIds[1]}-${childId}`)
        : undefined;
      edges.push({
        id: `union-${edge.id}-${childId}`,
        type: "unionChild",
        source: union.parentIds[0],
        target: childId,
        data: {
          parentAId: union.parentIds[0],
          parentBId: union.parentIds[1],
          isOnTracePath: childIsOnTracePath,
          // Only this child's own trunk line extends back to the traced
          // parent — a sibling of theirs (same couple, not on the path)
          // keeps a plain trunk starting at the partnership midpoint.
          tracedParentId: childIsOnTracePath ? tracedPartnerId : undefined,
        },
      });
    }
  }

  return edges;
}

export function toReactFlow(
  graph: TreeLayoutGraph,
  familyId: string,
  cardStyle: TreeCardStyle,
  highlight: TreeHighlightState = {},
): { nodes: PersonFlowNode[]; edges: TreeFlowEdge[] } {
  const edges = toFlowEdges(graph, highlight);
  // Array order does NOT control paint order here — XYFlow's default
  // zIndexMode ('basic') assigns every edge the same CSS z-index (its own
  // edge.zIndex, default 0, plus a node-elevation term that's also 0 for
  // plain unselected nodes) regardless of where it sits in this array, so a
  // traced edge crossing a plain sibling edge (e.g. Виктор's parent_child
  // line crossing his partnership line to Галина) could still end up
  // underneath it. Giving traced edges an explicit higher zIndex is what
  // 'basic' mode actually reads to decide stacking.
  const elevatedEdges = edges.map((edge) => {
    const isFullyTraced = edge.data?.isOnTracePath === true;
    // A partnership edge half-colored via tracedPartnerId (see toFlowEdges)
    // needs the same elevation — it's still an accent-colored stroke that
    // can otherwise end up under a plain crossing line.
    const isPartiallyTraced =
      edge.type === "partnership" && "tracedPartnerId" in (edge.data ?? {}) && edge.data?.tracedPartnerId != null;
    return isFullyTraced || isPartiallyTraced ? { ...edge, zIndex: 1 } : edge;
  });

  return {
    nodes: graph.nodes.map((node) => toFlowNode(node, familyId, cardStyle, highlight)),
    edges: elevatedEdges,
  };
}
