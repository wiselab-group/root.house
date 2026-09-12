import type {
  TreeLayoutGraph,
  LayoutNode,
} from "@/domain/tree/tree-layout.builder";

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
 * reachable from them by walking DOWN parent_child edges (their own
 * children, grandchildren, ...) — never the collapsed person's OWN
 * ancestors, never their OWN partner's separate branch. A collapsed
 * person's own card, and their partner(s), always stay visible; only the
 * subtree hanging below them folds away.
 *
 * Each DESCENDANT found this way takes their own spouse(s) and that
 * spouse's whole ancestor branch down with them (user-confirmed behavior,
 * 2026-09-12 — see memory tree-layout-collapse-spouse-branch): a hidden
 * child's spouse, and everyone reachable by walking UP parent_child edges
 * from that spouse (their parents, grandparents, ...), is folded away too,
 * not left floating with no visible connection to anything else on screen.
 * This does NOT apply to the collapsed root itself — collapsing someone
 * never hides their OWN spouse or in-laws, only a descendant's.
 *
 * Two kinds of collapse key (user-confirmed 2026-09-12 — the badge moves
 * onto the union when a shared union with children exists, see
 * findUnionsWithChildren/union-collapse-badge.tsx):
 * - `person:<personId>` — the original per-person toggle (PersonNode's own
 *   badge, rendered only when NONE of this person's children are already
 *   covered by a union badge — see xyflow-adapter.ts): hides EVERY child of
 *   this person, across ALL of their partnerships, plus any solo/
 *   single-parent child.
 * - `union:<partnershipEdgeId>` — a per-union toggle (the badge rendered on
 *   the partnership line's own midpoint): hides ONLY the children shared by
 *   that ONE partnership. Needed for multi-marriage (rewrite plan's
 *   alternating-spouses layout) — collapsing one marriage's children must
 *   never also hide a DIFFERENT marriage's children just because both
 *   marriages share a parent.
 */

/**
 * Returns a NEW TreeLayoutGraph with every person strictly BELOW a
 * collapsed person/union removed (and any edge touching a removed person),
 * plus `collapsedDescendantCount` attached to the node that should carry the
 * "+N" badge for each collapse key — the collapsed person themselves for a
 * `person:` key, or the lexicographically-first partner for a `union:` key
 * (see findUnionsWithChildren's own doc comment on why either partner works
 * — they share the exact same children).
 *
 * A person nested under TWO different collapsed branches (rare — e.g. a
 * remarried descendant reachable via two different collapsed branches) is
 * removed once; the count charged to the OUTER collapsed branch is every
 * descendant reachable from it, regardless of whether a nested collapsed
 * branch would also claim some of the same people — counts intentionally
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
  const parentsOf = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "parent_child") continue;
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(edge.target);
    if (!parentsOf.has(edge.target)) parentsOf.set(edge.target, []);
    parentsOf.get(edge.target)!.push(edge.source);
  }
  const spousesOf = new Map<string, string[]>();
  const partnershipEdgeById = new Map<
    string,
    { source: string; target: string }
  >();
  for (const edge of graph.edges) {
    if (edge.kind !== "partnership") continue;
    if (!spousesOf.has(edge.source)) spousesOf.set(edge.source, []);
    spousesOf.get(edge.source)!.push(edge.target);
    if (!spousesOf.has(edge.target)) spousesOf.set(edge.target, []);
    spousesOf.get(edge.target)!.push(edge.source);
    partnershipEdgeById.set(edge.id, {
      source: edge.source,
      target: edge.target,
    });
  }

  const descendantCountByAnchorId = new Map<string, number>();
  const hiddenIds = new Set<string>();

  for (const collapsedId of collapsedIds) {
    const resolved = resolveCollapseRoot(collapsedId, partnershipEdgeById);
    if (!resolved) continue; // stale union: key (partnership no longer in graph) — nothing to do
    const rootChildIds = resolved.isUnion
      ? sharedChildrenOf(resolved.parentIds, childrenOf)
      : (childrenOf.get(resolved.anchorId) ?? []);

    const descendants = collectDescendantIds(
      rootChildIds,
      childrenOf,
      parentsOf,
      spousesOf,
    );
    descendantCountByAnchorId.set(resolved.anchorId, descendants.size);
    for (const id of descendants) hiddenIds.add(id);
  }

  // The focus person is NOT exempt (user-confirmed 2026-09-12, reversing the
  // earlier rescue): collapsing a branch the current focus happens to be
  // inside hides them along with everyone else in that branch — the badge's
  // "+N" count includes them like any other descendant, and no fallback
  // re-focus happens automatically (also user-confirmed — the viewport just
  // stays where it is, same as collapsing any other branch).

  // An anchor nested inside ANOTHER collapsed branch's own hidden subtree
  // has no visible card left to carry a badge on — drop it from the count
  // map too (its own count would never be rendered).
  for (const anchorId of descendantCountByAnchorId.keys()) {
    if (hiddenIds.has(anchorId)) descendantCountByAnchorId.delete(anchorId);
  }

  const nodes: LayoutNode[] = graph.nodes
    .filter((node) => !hiddenIds.has(node.id))
    .map((node) => {
      const count = descendantCountByAnchorId.get(node.id);
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

/** One partnership that has at least one shared child — see findUnionsWithChildren. */
export interface UnionWithChildren {
  /** The collapse toggle's own state key — see use-collapsed-branches.ts's `Set<string>` and this file's own doc comment on the two key shapes. Always `union:<partnershipEdgeId>`. */
  collapseKey: string;
  parentAId: string;
  parentBId: string;
}

/**
 * Every partnership in `graph` where the two partners share at least one
 * recorded child — used to decide when a collapse toggle belongs on the
 * union (between the two cards, where their shared descendants' trunk line
 * actually starts) rather than on one partner's own card (see
 * union-collapse-badge.tsx's own doc comment for why). A partner with a
 * child from a DIFFERENT relationship (no shared union) still gets their
 * own per-person badge — only a truly shared union moves it (see
 * personIdsNeedingOwnBadge below).
 */
export function findUnionsWithChildren(
  graph: TreeLayoutGraph,
): UnionWithChildren[] {
  const sharedChildParentPairs = sharedChildParentPairKeys(graph);

  const unions: UnionWithChildren[] = [];
  const seenPairs = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind !== "partnership") continue;
    const pairKey = [edge.source, edge.target].sort().join("::");
    if (!sharedChildParentPairs.has(pairKey) || seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);
    unions.push({
      collapseKey: `union:${edge.id}`,
      parentAId: edge.source,
      parentBId: edge.target,
    });
  }
  return unions;
}

/**
 * Person ids that still need their OWN per-card collapse badge — i.e. they
 * have at least one child NOT already covered by a union badge (a solo/
 * single-recorded-parent child, or a child from a partnership whose OTHER
 * parent isn't in this graph at all). A person whose every child is shared
 * with a partnered spouse gets no card-level badge of their own — the union
 * badge on their partnership line already covers that exact set of children
 * (see xyflow-adapter.ts's toFlowNode, which reads this to set hasChildren).
 */
export function personIdsNeedingOwnBadge(graph: TreeLayoutGraph): Set<string> {
  const sharedChildParentPairs = sharedChildParentPairKeys(graph);
  const parentsByChild = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "parent_child") continue;
    if (!parentsByChild.has(edge.target)) parentsByChild.set(edge.target, []);
    parentsByChild.get(edge.target)!.push(edge.source);
  }

  const needsOwnBadge = new Set<string>();
  for (const parentIds of parentsByChild.values()) {
    const isCoveredByUnion =
      parentIds.length === 2 &&
      sharedChildParentPairs.has([...parentIds].sort().join("::"));
    if (isCoveredByUnion) continue;
    for (const parentId of parentIds) needsOwnBadge.add(parentId);
  }
  return needsOwnBadge;
}

/** pairKey ("a::b", sorted) -> true for every parent pair that shares at least one child. */
function sharedChildParentPairKeys(graph: TreeLayoutGraph): Set<string> {
  const parentsByChild = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "parent_child") continue;
    if (!parentsByChild.has(edge.target)) parentsByChild.set(edge.target, []);
    parentsByChild.get(edge.target)!.push(edge.source);
  }
  const pairs = new Set<string>();
  for (const parentIds of parentsByChild.values()) {
    if (parentIds.length !== 2) continue;
    pairs.add([...parentIds].sort().join("::"));
  }
  return pairs;
}

/**
 * Resolves one collapse key (see this file's own doc comment on the two
 * shapes) into the id whose card carries the "+N" badge (`anchorId`) and
 * either the two partner ids (`isUnion: true`, badge covers only their
 * SHARED children) or nothing further (`isUnion: false`, badge covers every
 * child of `anchorId` across all partnerships). Returns undefined for a
 * stale `union:<edgeId>` key whose partnership no longer exists in this
 * graph (e.g. the relationship was deleted after the toggle was clicked) —
 * nothing to collapse, silently ignored rather than throwing.
 */
function resolveCollapseRoot(
  collapsedId: string,
  partnershipEdgeById: Map<string, { source: string; target: string }>,
):
  | { anchorId: string; isUnion: true; parentIds: [string, string] }
  | { anchorId: string; isUnion: false }
  | undefined {
  if (collapsedId.startsWith("union:")) {
    const edgeId = collapsedId.slice("union:".length);
    const partnership = partnershipEdgeById.get(edgeId);
    if (!partnership) return undefined;
    const parentIds: [string, string] = [
      partnership.source,
      partnership.target,
    ].sort() as [string, string];
    return { anchorId: parentIds[0], isUnion: true, parentIds };
  }
  if (collapsedId.startsWith("person:")) {
    return { anchorId: collapsedId.slice("person:".length), isUnion: false };
  }
  // Back-compat: a bare personId (no prefix) is treated as `person:` — keeps
  // this function total for any caller not yet updated to the prefixed
  // shape, though every current caller (use-collapsed-branches.ts) always
  // prefixes now.
  return { anchorId: collapsedId, isUnion: false };
}

/** Every child shared by BOTH ids in parentIds — i.e. a parent_child edge from EACH of them to the same target. */
function sharedChildrenOf(
  parentIds: [string, string],
  childrenOf: Map<string, string[]>,
): string[] {
  const [a, b] = parentIds;
  const childrenOfB = new Set(childrenOf.get(b) ?? []);
  return (childrenOf.get(a) ?? []).filter((childId) =>
    childrenOfB.has(childId),
  );
}

/**
 * BFS down parent_child edges starting from `rootChildIds` (already the
 * first row below whatever was collapsed — a person's own card, or a
 * union's shared children, is never included here, only what hangs beneath
 * it). Each descendant found this way also pulls in their OWN spouse(s) and
 * that spouse's entire ancestor branch (walking UP parent_child edges from
 * the spouse) — see this file's own doc comment for why.
 */
function collectDescendantIds(
  rootChildIds: string[],
  childrenOf: Map<string, string[]>,
  parentsOf: Map<string, string[]>,
  spousesOf: Map<string, string[]>,
): Set<string> {
  const visited = new Set<string>();
  // Each frontier entry tracks whether it's a BLOOD descendant of the
  // collapsed root (reached via childrenOf) as opposed to an in-law pulled
  // in via a blood descendant's spouse — only a blood descendant's own
  // spouse triggers the spouse-pull below. Without this split, walking UP
  // from an in-law's ancestor can wander back through THEIR spouse (the
  // original blood descendant) and right back up that blood descendant's
  // own ancestor chain — all the way past the collapsed root to its own
  // parent — incorrectly hiding the root itself and everyone above it.
  let frontier: { id: string; isBlood: boolean }[] = rootChildIds.map((id) => ({
    id,
    isBlood: true,
  }));
  while (frontier.length > 0) {
    const next: { id: string; isBlood: boolean }[] = [];
    for (const { id, isBlood } of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      for (const childId of childrenOf.get(id) ?? []) {
        next.push({ id: childId, isBlood: true });
      }
      if (!isBlood) continue;
      // Pull this BLOOD descendant's spouse(s) — and everyone reachable by
      // walking UP from a spouse (their parents, grandparents, ...) — into
      // the same hidden set, via a separate ancestor-only walk (never back
      // down a spouse's OTHER children, which aren't the collapsed root's
      // descendants).
      for (const spouseId of spousesOf.get(id) ?? []) {
        if (!visited.has(spouseId)) next.push({ id: spouseId, isBlood: false });
        for (const ancestorId of collectAncestorIds(spouseId, parentsOf)) {
          if (!visited.has(ancestorId)) {
            next.push({ id: ancestorId, isBlood: false });
          }
        }
      }
    }
    frontier = next;
  }
  return visited;
}

/** BFS up parent_child edges from personId (personId itself excluded) — every ancestor: parents, grandparents, and so on. */
function collectAncestorIds(
  personId: string,
  parentsOf: Map<string, string[]>,
): Set<string> {
  const visited = new Set<string>();
  let frontier = parentsOf.get(personId) ?? [];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      for (const parentId of parentsOf.get(id) ?? []) next.push(parentId);
    }
    frontier = next;
  }
  return visited;
}
