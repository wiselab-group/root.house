import type { TreeLayoutGraph, LayoutNode } from "@/domain/tree/tree-layout.builder";

/**
 * prune-collapsed.ts — collapse/expand (rewrite plan §7 Stage 5, §3.2).
 *
 * Collapse state is a purely client-side, ephemeral concern (see
 * use-collapsed-branches.ts) — it never touches the database or the URL,
 * and it never re-runs the layout engine. `buildTreeLayout` already
 * computed every person's position server-side against the FULL family
 * graph; collapsing a branch only changes which of those already-computed
 * nodes/edges get handed to XYFlow this render. Neighboring branches keep
 * their exact server-computed positions — a collapse toggle never nudges
 * anyone NOT inside the collapsed subtree (a deliberate simplification: the
 * plan's own §3.2 called for re-running the layout engine client-side so
 * the freed space visually compacts, but that requires shipping the raw
 * FamilyGraph to the client and risks shifting unrelated branches on every
 * toggle — this file takes the lower-risk "hide, don't re-lay-out" reading
 * instead).
 *
 * "Descendants only" (per the plan): collapsing a person hides everyone
 * reachable from them by walking DOWN parent_child edges only (their own
 * children, grandchildren, ...) — never ancestors, never a spouse's own
 * separate branch. A collapsed person's own card, and their partner(s),
 * always stay visible; only the subtree hanging below them folds away.
 */

/**
 * Returns a NEW TreeLayoutGraph with every person strictly BELOW a
 * collapsed ancestor removed (and any edge touching a removed person),
 * plus `collapsedDescendantCount` attached to each node whose id is in
 * `collapsedIds` (so the card can render its own "+N" badge without a
 * second pass over the graph).
 *
 * A person nested under TWO different collapsed ancestors (rare — e.g. a
 * remarried descendant reachable via two different collapsed branches) is
 * removed once; the count charged to the OUTER collapsed ancestor is every
 * descendant reachable from them, regardless of whether a nested collapsed
 * ancestor would also claim some of the same people — counts intentionally
 * are NOT mutually exclusive between two collapsed branches, since each
 * badge answers "how many people are hidden below ME", independent of
 * whatever else happens to also be collapsed elsewhere in the tree.
 */
export function pruneCollapsedDescendants(
  graph: TreeLayoutGraph,
  collapsedIds: ReadonlySet<string>,
): TreeLayoutGraph {
  if (collapsedIds.size === 0) return graph;

  const childrenOf = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "parent_child") continue;
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(edge.target);
  }

  const descendantCountByCollapsedId = new Map<string, number>();
  const hiddenIds = new Set<string>();

  for (const collapsedId of collapsedIds) {
    const descendants = collectDescendantIds(collapsedId, childrenOf);
    descendantCountByCollapsedId.set(collapsedId, descendants.size);
    for (const id of descendants) hiddenIds.add(id);
  }

  // The current focus person's own card must never disappear as a side
  // effect of collapsing one of THEIR ancestors — e.g. collapsing Viktor
  // while the focus is Viktor's own child would otherwise hide the exact
  // person the whole tree is centered on and being viewed around, with no
  // obvious way back short of re-navigating. The badge count above still
  // reflects the TRUE full descendant count (unaffected by this rescue), so
  // "+N" doesn't silently under-report just because one of the N is exempt
  // from being hidden.
  hiddenIds.delete(graph.focusPersonId);

  // A collapsed person nested inside ANOTHER collapsed person's own hidden
  // subtree has no visible card left to carry a badge on — drop it from the
  // count map too (its own count would never be rendered).
  for (const collapsedId of collapsedIds) {
    if (hiddenIds.has(collapsedId)) descendantCountByCollapsedId.delete(collapsedId);
  }

  const nodes: LayoutNode[] = graph.nodes
    .filter((node) => !hiddenIds.has(node.id))
    .map((node) => {
      const count = descendantCountByCollapsedId.get(node.id);
      return count === undefined
        ? node
        : { ...node, collapsedDescendantCount: count };
    });

  const edges = graph.edges.filter(
    (edge) => !hiddenIds.has(edge.source) && !hiddenIds.has(edge.target),
  );

  return { ...graph, nodes, edges };
}

/**
 * Every person id in `graph` who has at least one child (parent_child
 * edge where they're the source) — used to decide which cards even get a
 * collapse toggle at all (a childless leaf has nothing to hide).
 */
export function personIdsWithChildren(graph: TreeLayoutGraph): Set<string> {
  const ids = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind === "parent_child") ids.add(edge.source);
  }
  return ids;
}

/** BFS down parent_child edges only, starting BELOW rootId (rootId itself is never included — its own card stays visible, only what hangs beneath it collapses). */
function collectDescendantIds(
  rootId: string,
  childrenOf: Map<string, string[]>,
): Set<string> {
  const visited = new Set<string>();
  let frontier = childrenOf.get(rootId) ?? [];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      for (const childId of childrenOf.get(id) ?? []) next.push(childId);
    }
    frontier = next;
  }
  return visited;
}
