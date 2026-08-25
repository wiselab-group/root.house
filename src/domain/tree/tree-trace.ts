import type { RelationshipPathOutcome } from "@/domain/relationship/genealogy-algorithms";
import type { TreeLayoutGraph } from "./tree-layout.builder";

/**
 * tree-trace.ts — decorates a TreeLayoutGraph with "is this node/edge part of
 * the traced relationship path between Person A and Person B" (plan §17
 * Relationship Trace UI). Deliberately a separate decorator over
 * TreeLayoutGraph — same pattern as tree-filter.ts's applyFilter — rather
 * than baking trace fields into LayoutNode/LayoutEdge in
 * tree-layout.builder.ts, so the pure BFS layout algorithm and its existing
 * test suite stay untouched by a concern that's orthogonal to layout itself.
 *
 * Takes the ALREADY-COMPUTED RelationshipPathOutcome from
 * genealogy-algorithms.ts::findRelationshipPath — this module does no
 * traversal of its own, it only maps a path onto a layout graph's node/edge
 * ids for rendering.
 */

export interface TracedTreeLayoutGraph extends TreeLayoutGraph {
  /** Person ids on the path from A to B (inclusive), or empty if not traced/not found. */
  tracePersonIds: Set<string>;
  /** Edge ids (LayoutEdge.id) on the path, or empty if not traced/not found. */
  traceEdgeIds: Set<string>;
  traceStatus: RelationshipPathOutcome["status"] | null;
}

/**
 * Applies a findRelationshipPath() result onto a TreeLayoutGraph: marks which
 * already-laid-out nodes/edges fall on the traced path so the UI can
 * highlight them (and dim everything else). A path person/edge that isn't
 * currently visible in `graph` (outside the focus window) is simply not
 * markable — tracePersonIds/traceEdgeIds only ever reference ids present in
 * `graph`, so callers never need to guard against dangling highlight
 * references.
 */
export function applyRelationshipTrace(
  graph: TreeLayoutGraph,
  outcome: RelationshipPathOutcome | null,
): TracedTreeLayoutGraph {
  if (!outcome || outcome.status !== "found") {
    return {
      ...graph,
      tracePersonIds: new Set(),
      traceEdgeIds: new Set(),
      traceStatus: outcome?.status ?? null,
    };
  }

  const visibleIds = new Set(graph.nodes.map((n) => n.id));
  const tracePersonIds = new Set(outcome.personIds.filter((id) => visibleIds.has(id)));

  const traceEdgeIds = new Set(
    graph.edges
      .filter((edge) => {
        // A parent_child edge is on the path if consecutive personIds in the
        // outcome match this edge's source/target (in either direction —
        // the path may traverse the edge "up" or "down" depending on which
        // side of the common ancestor it's on).
        for (let i = 0; i < outcome.personIds.length - 1; i++) {
          const a = outcome.personIds[i];
          const b = outcome.personIds[i + 1];
          if ((edge.source === a && edge.target === b) || (edge.source === b && edge.target === a)) {
            return true;
          }
        }
        return false;
      })
      .map((edge) => edge.id),
  );

  return { ...graph, tracePersonIds, traceEdgeIds, traceStatus: outcome.status };
}
