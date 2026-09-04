import type {
  FamilyGraph,
  NormalizedGraph,
  NormalizedPerson,
  Partnership,
  SoloParent,
  Branch,
  Gender,
} from "./types";

/**
 * Husband-first ordering: male < unknown < female, tie-broken by id so the
 * result is deterministic regardless of input order (§39 determinism).
 */
const GENDER_RANK: Record<Gender, number> = { male: 0, unknown: 1, female: 2 };

export function shouldBeLeft(
  aGender: Gender,
  bGender: Gender,
  aId: string,
  bId: string,
): boolean {
  const rankA = GENDER_RANK[aGender];
  const rankB = GENDER_RANK[bGender];
  if (rankA !== rankB) return rankA < rankB;
  return aId < bId;
}

/**
 * normalizeGraph — turns the raw Person/Relationship graph into the layout's
 * working model: one Partnership per spouse relationship (never merged per
 * person — that's what breaks remarriage), children attributed to their
 * parents' shared partnership (or a SoloParent when the other parent is
 * absent from the graph), a soft BFS generation number, and a soft
 * paternal/maternal/descendant branch hint.
 */
export function normalizeGraph(
  graph: FamilyGraph,
  focusPersonId: string,
): NormalizedGraph {
  const personById = new Map<string, NormalizedPerson>();
  for (const p of graph.persons) {
    personById.set(p.id, {
      ...p,
      generation: 0,
      partnershipIds: [],
      parentIds: [],
      branch: "unknown",
    });
  }
  if (!personById.has(focusPersonId)) {
    throw new Error(
      `normalizeGraph: focusPersonId "${focusPersonId}" is not present in graph.persons`,
    );
  }

  // ---- parent-child adjacency -------------------------------------------
  const childrenOf = new Map<string, string[]>(); // parentId -> childIds
  const parentsOf = new Map<string, string[]>(); // childId -> parentIds
  for (const rel of graph.relationships) {
    if (rel.kind !== "parent-child") continue;
    if (!personById.has(rel.from) || !personById.has(rel.to)) continue;
    pushInto(childrenOf, rel.from, rel.to);
    pushInto(parentsOf, rel.to, rel.from);
    personById.get(rel.to)!.parentIds.push(rel.from);
  }

  // ---- partnerships: one per spouse relationship -------------------------
  const partnershipById = new Map<string, Partnership>();
  // For attributing children to the *pair* that share them.
  const partnershipKeyToId = new Map<string, string>(); // "a|b" sorted -> partnership id

  for (const rel of graph.relationships) {
    if (rel.kind !== "spouse") continue;
    if (!personById.has(rel.from) || !personById.has(rel.to)) continue;
    const a = personById.get(rel.from)!;
    const b = personById.get(rel.to)!;
    const aLeft = shouldBeLeft(a.gender, b.gender, a.id, b.id);
    const leftPersonId = aLeft ? a.id : b.id;
    const rightPersonId = aLeft ? b.id : a.id;

    const leftChildren = new Set(childrenOf.get(leftPersonId) ?? []);
    const rightChildren = childrenOf.get(rightPersonId) ?? [];
    const sharedChildren = rightChildren.filter((c) => leftChildren.has(c));
    // If neither side individually has recorded children, fall back to the
    // union so partnerships with only one parent's child-edges recorded
    // still show their children (defensive — real graphs are rarely this
    // sparse, but incomplete data shouldn't silently orphan children).
    const childrenIds =
      sharedChildren.length > 0
        ? sharedChildren
        : [...new Set([...leftChildren, ...rightChildren])];

    const partnership: Partnership = {
      id: rel.id,
      leftPersonId,
      rightPersonId,
      status: rel.status ?? "married",
      childrenIds,
    };
    partnershipById.set(partnership.id, partnership);
    personById.get(leftPersonId)!.partnershipIds.push(partnership.id);
    personById.get(rightPersonId)!.partnershipIds.push(partnership.id);
    partnershipKeyToId.set(
      pairKey(leftPersonId, rightPersonId),
      partnership.id,
    );
  }

  // ---- solo parents: children whose partnership can't be resolved -------
  const attributedChildIds = new Set<string>();
  for (const p of partnershipById.values()) {
    for (const c of p.childrenIds) attributedChildIds.add(c);
  }
  const soloParentByPersonId = new Map<string, SoloParent>();
  for (const [parentId, kids] of childrenOf.entries()) {
    const unattributed = kids.filter((k) => !attributedChildIds.has(k));
    if (unattributed.length === 0) continue;
    soloParentByPersonId.set(parentId, {
      personId: parentId,
      childrenIds: unattributed,
    });
  }

  // ---- generation: BFS distance from focus (soft hint only) -------------
  assignGenerations(personById, childrenOf, parentsOf, focusPersonId);

  // ---- branch: paternal / maternal / descendant / focus (soft hint) -----
  assignBranches(
    personById,
    childrenOf,
    parentsOf,
    partnershipById,
    focusPersonId,
  );

  return {
    personById,
    partnershipById,
    soloParentByPersonId,
    relationships: graph.relationships,
    focusPersonId,
  };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pushInto<K>(map: Map<K, string[]>, key: K, value: string): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/**
 * BFS both directions from focus (parents, children, AND spouses at the same
 * generation as their partner) so every reachable person gets a consistent
 * soft generation number. Spouses are kept at their partner's generation —
 * a marriage doesn't shift someone's ancestor/descendant depth.
 */
function assignGenerations(
  personById: Map<string, NormalizedPerson>,
  childrenOf: Map<string, string[]>,
  parentsOf: Map<string, string[]>,
  focusPersonId: string,
): void {
  const visited = new Set<string>([focusPersonId]);
  personById.get(focusPersonId)!.generation = 0;
  let frontier = [focusPersonId];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const gen = personById.get(id)!.generation;
      for (const childId of childrenOf.get(id) ?? []) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        personById.get(childId)!.generation = gen + 1;
        next.push(childId);
      }
      for (const parentId of parentsOf.get(id) ?? []) {
        if (visited.has(parentId)) continue;
        visited.add(parentId);
        personById.get(parentId)!.generation = gen - 1;
        next.push(parentId);
      }
      for (const partnershipId of personById.get(id)!.partnershipIds) {
        const spouseId = spouseOf(personById, partnershipId, id);
        if (!spouseId || visited.has(spouseId)) continue;
        visited.add(spouseId);
        personById.get(spouseId)!.generation = gen;
        next.push(spouseId);
      }
    }
    frontier = next;
  }
}

function spouseOf(
  personById: Map<string, NormalizedPerson>,
  partnershipId: string,
  personId: string,
): string | undefined {
  for (const [id, p] of personById) {
    if (id === personId) continue;
    if (p.partnershipIds.includes(partnershipId)) return id;
  }
  return undefined;
}

/**
 * Branch assignment: focus person is "focus"; focus's own descendants are
 * "descendant"; the father's whole ancestor line (and everyone who joins it
 * by marriage, and their non-focus-line descendants such as paternal
 * uncles/aunts and cousins) is "paternal"; symmetrically for "maternal".
 *
 * Implemented as one flood-fill per direct parent of focus, walking up
 * (ancestors), sideways (spouses), and down (their *other* children/
 * descendants) — but never crossing back through the focus person itself,
 * so a shared ancestor of both parents doesn't leak the wrong label, and
 * never walking down through the focus person's own descendant line.
 */
function assignBranches(
  personById: Map<string, NormalizedPerson>,
  childrenOf: Map<string, string[]>,
  parentsOf: Map<string, string[]>,
  partnershipById: Map<string, Partnership>,
  focusPersonId: string,
): void {
  personById.get(focusPersonId)!.branch = "focus";

  // Focus's own descendants.
  floodFill(childrenOf.get(focusPersonId) ?? [], (id) => {
    const person = personById.get(id)!;
    if (person.branch !== "unknown") return [];
    person.branch = "descendant";
    return [...(childrenOf.get(id) ?? []), ...spousesOf(personById, id)];
  });

  const directParents = parentsOf.get(focusPersonId) ?? [];
  const [fatherLike, motherLike] = orderParentsBySide(
    personById,
    directParents,
  );

  // Both sides flood SIMULTANEOUSLY (one shared BFS frontier, not one
  // side's floodFill running to completion before the other starts) — a
  // sequential "paternal first, then maternal" would let the paternal flood
  // reach mother via the father-mother spouse edge and mislabel her before
  // the maternal flood ever gets a turn (§22 bug: both parents ending up on
  // the same side).
  const seeded: Array<[string, Branch]> = [];
  if (fatherLike) seeded.push([fatherLike, "paternal"]);
  if (motherLike) seeded.push([motherLike, "maternal"]);

  for (const [id, branch] of seeded) {
    const person = personById.get(id);
    if (person && person.branch === "unknown") person.branch = branch;
  }

  let frontier: Array<[string, Branch]> = seeded;
  const seen = new Set(seeded.map(([id]) => id));

  while (frontier.length > 0) {
    const next: Array<[string, Branch]> = [];
    for (const [id, branch] of frontier) {
      const spouses = spousesOf(personById, id);
      const kids = (childrenOf.get(id) ?? []).filter(
        (c) => c !== focusPersonId,
      );
      const parents = (parentsOf.get(id) ?? []).filter(
        (p) => p !== focusPersonId,
      );
      const neighbors = [...spouses, ...kids, ...parents];
      for (const nb of neighbors) {
        if (nb === focusPersonId || seen.has(nb)) continue;
        seen.add(nb);
        const nbPerson = personById.get(nb);
        if (nbPerson && nbPerson.branch === "unknown") nbPerson.branch = branch;
        next.push([nb, branch]);
      }
    }
    frontier = next;
  }

  function spousesOf(
    map: Map<string, NormalizedPerson>,
    personId: string,
  ): string[] {
    const person = map.get(personId);
    if (!person) return [];
    const out: string[] = [];
    for (const pid of person.partnershipIds) {
      const partnership = partnershipById.get(pid);
      if (!partnership) continue;
      const other =
        partnership.leftPersonId === personId
          ? partnership.rightPersonId
          : partnership.leftPersonId;
      out.push(other);
    }
    return out;
  }

  function floodFill(seed: string[], expand: (id: string) => string[]): void {
    let localFrontier = seed;
    const localSeen = new Set(seed);
    while (localFrontier.length > 0) {
      const next: string[] = [];
      for (const id of localFrontier) {
        for (const nb of expand(id)) {
          if (localSeen.has(nb)) continue;
          localSeen.add(nb);
          next.push(nb);
        }
      }
      localFrontier = next;
    }
  }
}

/**
 * Orders focus's direct parents as [father-like, mother-like] by gender rank
 * (male first) so paternal always maps to "left-preferring" and maternal to
 * "right-preferring" regardless of the order they appear in the input graph.
 * Falls back to array order when genders don't disambiguate (both unknown,
 * or a single parent recorded).
 */
function orderParentsBySide(
  personById: Map<string, NormalizedPerson>,
  parentIds: string[],
): [string | undefined, string | undefined] {
  if (parentIds.length === 0) return [undefined, undefined];
  if (parentIds.length === 1) return [parentIds[0], undefined];
  const [a, b] = parentIds;
  const genderA = personById.get(a)?.gender ?? "unknown";
  const genderB = personById.get(b)?.gender ?? "unknown";
  if (shouldBeLeft(genderA, genderB, a, b)) return [a, b];
  return [b, a];
}
