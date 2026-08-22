import type { Node, Edge } from "@xyflow/react";
import type {
  TreeLayoutGraph,
  LayoutNode,
} from "@/domain/tree/tree-layout.builder";

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
}

export type PersonFlowNode = Node<PersonNodeData, "person">;
export type RelationshipFlowEdge = Edge<
  Record<string, unknown>,
  "parentChild" | "partnership"
>;

function toFlowNode(node: LayoutNode, familyId: string): PersonFlowNode {
  return {
    id: node.id,
    type: "person",
    position: { x: node.x, y: node.y },
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
    },
    // XYFlow needs explicit dimensions before layout/fitView math is
    // reliable; matches the fixed size the PersonNode component renders at
    // (see tree-layout.builder.ts's SIBLING_X_SPACING, which depends on this).
    width: 220,
    height: 88,
  };
}

function toFlowEdges(graph: TreeLayoutGraph): RelationshipFlowEdge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    type: edge.kind === "partnership" ? "partnership" : "parentChild",
    source: edge.source,
    target: edge.target,
    // Partnership edges (spouse) are visually distinct (dashed) from
    // parent_child edges (solid) — see tree-canvas.tsx edge styling.
    data: { isCurrent: edge.isCurrent ?? true },
  }));
}

export function toReactFlow(
  graph: TreeLayoutGraph,
  familyId: string,
): { nodes: PersonFlowNode[]; edges: RelationshipFlowEdge[] } {
  return {
    nodes: graph.nodes.map((node) => toFlowNode(node, familyId)),
    edges: toFlowEdges(graph),
  };
}
