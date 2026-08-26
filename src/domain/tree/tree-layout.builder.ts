/**
 * tree-layout.builder.ts — converts the Person+Relationship graph into a
 * generic, library-agnostic layout: nodes with (x, y, generation) and edges.
 *
 * This is the ONE place that decides how a family tree is laid out visually.
 * It has NO knowledge of @xyflow/react or any other rendering library — the
 * adapter layer (components/tree/adapters/xyflow-adapter.ts) is responsible
 * for translating TreeLayoutGraph into whatever a specific graph-viz library
 * needs. This split is what lets us add ancestors-only/descendants-only/
 * genogram/timeline views later (each a new builder function producing the
 * same TreeLayoutGraph shape) without touching the database or the viz lib.
 */

export interface PersonNode {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  photoMediaId: string | null;
  /** Present so tree-filter.ts can match on them without a second Person lookup — not used by layout positioning itself. */
  gender: "male" | "female" | "unknown";
  religion: string | null;
  nationality: string | null;
}

export interface ParentChildEdgeInput {
  parentId: string;
  childId: string;
}

export interface PartnershipEdgeInput {
  person1Id: string;
  person2Id: string;
  isCurrent: boolean;
}

export interface BuildTreeLayoutInput {
  persons: PersonNode[];
  parentChildEdges: ParentChildEdgeInput[];
  partnershipEdges: PartnershipEdgeInput[];
  focusPersonId: string;
  /** Generations of ancestors to include above focusPersonId. Default 2 (parents + grandparents). */
  ancestorGenerations?: number;
  /** Generations of descendants to include below focusPersonId. Default 2 (children + grandchildren). */
  descendantGenerations?: number;
}

export type LayoutNodeKind = "person";

export interface LayoutNode {
  id: string; // == personId, one node per person in the visible slice
  kind: LayoutNodeKind;
  personId: string;
  x: number;
  y: number;
  /** 0 = focus person's generation, negative = ancestors, positive = descendants. */
  generation: number;
  isFocus: boolean;
  person: PersonNode;
}

export type LayoutEdgeKind = "parent_child" | "partnership";

export interface LayoutEdge {
  id: string;
  kind: LayoutEdgeKind;
  source: string; // personId
  target: string; // personId
  isCurrent?: boolean; // partnership edges only
}

export interface TreeLayoutGraph {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  focusPersonId: string;
}

const GENERATION_Y_SPACING = 180;
// Matches PersonNode's rendered width (220px, see xyflow-adapter.ts) plus a
// fixed 24px gutter between sibling cards.
const SIBLING_X_SPACING = 244;

const DEFAULT_ANCESTOR_GENERATIONS = 2;
const DEFAULT_DESCENDANT_GENERATIONS = 2;

/**
 * Builds a "focus tree" layout: the focus person centered, ancestors above
 * (by generation), descendants below, spouses beside their partner. This is
 * the MVP layout algorithm — a simple generational BFS, not a general graph
 * layout library (dagre etc. can replace this function later without
 * changing its input/output contract).
 */
export function buildFocusTreeLayout(
  input: BuildTreeLayoutInput,
): TreeLayoutGraph {
  const {
    persons,
    parentChildEdges,
    focusPersonId,
    ancestorGenerations = DEFAULT_ANCESTOR_GENERATIONS,
    descendantGenerations = DEFAULT_DESCENDANT_GENERATIONS,
  } = input;

  const personsById = new Map(persons.map((p) => [p.id, p]));
  if (!personsById.has(focusPersonId)) {
    return { nodes: [], edges: [], focusPersonId };
  }

  const parentsOf = groupBy(
    parentChildEdges,
    (e) => e.childId,
    (e) => e.parentId,
  );
  const childrenOf = groupBy(
    parentChildEdges,
    (e) => e.parentId,
    (e) => e.childId,
  );

  // generation: personId -> integer offset from focus (0 = focus's generation)
  const generationOf = new Map<string, number>([[focusPersonId, 0]]);
  // How many ancestor/descendant "hops" a person is from the nearest node
  // whose own BFS actually reached them (focusPersonId starts at 0 for
  // both). A sibling or partner added mid-pass inherits their anchor's own
  // remaining budget — they did not themselves cost a hop, they're a
  // lateral join at the same generation — so their ancestors/descendants
  // must still expand the full ancestorGenerations/descendantGenerations
  // from THAT anchor's own depth-so-far, not from a stunted budget.
  const ancestorDepthOf = new Map<string, number>([[focusPersonId, 0]]);
  const descendantDepthOf = new Map<string, number>([[focusPersonId, 0]]);

  // Multi-source BFS: every person discovered (via ancestor/descendant
  // traversal, sibling expansion, or partnership) is itself a source for
  // further ancestor/descendant traversal, sibling expansion, and
  // partnership joins — run all three to a fixed point together.
  //
  // The earlier version ran collectByBfs ONCE from focusPersonId, then
  // expanded siblings/partners as a separate pass — so a partner or
  // sibling pulled in by that second pass was a dead end: their OWN
  // parents/children/ancestors/descendants were never traversed. That is
  // why a partner's card would show with no family behind them at all
  // (e.g. Марфа Купчик rendered with no parents), and why which "side
  // branches" appeared depended on which person happened to be focus.
  let addedAny = true;
  while (addedAny) {
    addedAny = false;

    // Ancestors: from every node whose ancestor-budget isn't exhausted yet.
    for (const [personId, depth] of [...ancestorDepthOf]) {
      if (depth >= ancestorGenerations) continue;
      const generation = generationOf.get(personId)!;
      for (const parentId of parentsOf.get(personId) ?? []) {
        const isNew = !generationOf.has(parentId);
        if (isNew) {
          generationOf.set(parentId, generation - 1);
          addedAny = true;
        }
        if (!ancestorDepthOf.has(parentId) || ancestorDepthOf.get(parentId)! > depth + 1) {
          ancestorDepthOf.set(parentId, depth + 1);
          addedAny = true;
        }
      }
    }

    // Descendants: from every node whose descendant-budget isn't exhausted yet.
    for (const [personId, depth] of [...descendantDepthOf]) {
      if (depth >= descendantGenerations) continue;
      const generation = generationOf.get(personId)!;
      for (const childId of childrenOf.get(personId) ?? []) {
        const isNew = !generationOf.has(childId);
        if (isNew) {
          generationOf.set(childId, generation + 1);
          addedAny = true;
        }
        if (!descendantDepthOf.has(childId) || descendantDepthOf.get(childId)! > depth + 1) {
          descendantDepthOf.set(childId, depth + 1);
          addedAny = true;
        }
      }
    }

    // Siblings of any already-visible person join at that person's own
    // generation, inheriting their shared parent's remaining budgets so
    // the sibling's own ancestors/descendants keep expanding too.
    for (const [personId, generation] of [...generationOf]) {
      for (const parentId of parentsOf.get(personId) ?? []) {
        const parentAncestorDepth = ancestorDepthOf.get(parentId);
        for (const siblingId of childrenOf.get(parentId) ?? []) {
          if (!generationOf.has(siblingId)) {
            generationOf.set(siblingId, generation);
            addedAny = true;
          }
          if (parentAncestorDepth !== undefined) {
            const siblingBudget = parentAncestorDepth + 1;
            if (!ancestorDepthOf.has(siblingId) || ancestorDepthOf.get(siblingId)! > siblingBudget) {
              ancestorDepthOf.set(siblingId, siblingBudget);
              addedAny = true;
            }
          }
          if (!descendantDepthOf.has(siblingId)) {
            descendantDepthOf.set(siblingId, 0);
            addedAny = true;
          }
        }
      }
    }

    // Partners of any already-visible person join at that person's own
    // generation, inheriting their partner's remaining budgets so the
    // partner's own ancestors/descendants keep expanding too.
    for (const { person1Id, person2Id } of input.partnershipEdges) {
      const generation1 = generationOf.get(person1Id);
      const generation2 = generationOf.get(person2Id);
      if (generation1 !== undefined && generation2 === undefined) {
        generationOf.set(person2Id, generation1);
        addedAny = true;
      } else if (generation2 !== undefined && generation1 === undefined) {
        generationOf.set(person1Id, generation2);
        addedAny = true;
      }

      if (generationOf.has(person1Id) && generationOf.has(person2Id)) {
        if (mergeBudget(ancestorDepthOf, person1Id, person2Id)) addedAny = true;
        if (mergeBudget(descendantDepthOf, person1Id, person2Id)) addedAny = true;
      }
    }
  }

  const visibleIds = new Set(generationOf.keys());

  const nodesByGeneration = new Map<number, string[]>();
  for (const [id, generation] of generationOf) {
    if (!nodesByGeneration.has(generation))
      nodesByGeneration.set(generation, []);
    nodesByGeneration.get(generation)!.push(id);
  }

  const nodes: LayoutNode[] = [];
  for (const [generation, ids] of nodesByGeneration) {
    const orderedIds = orderByPartnership(ids, input.partnershipEdges);
    const totalWidth = (orderedIds.length - 1) * SIBLING_X_SPACING;
    orderedIds.forEach((id, index) => {
      const person = personsById.get(id);
      if (!person) return;
      nodes.push({
        id,
        kind: "person",
        personId: id,
        x: index * SIBLING_X_SPACING - totalWidth / 2,
        y: generation * GENERATION_Y_SPACING,
        generation,
        isFocus: id === focusPersonId,
        person,
      });
    });
  }

  const edges: LayoutEdge[] = [];
  for (const edge of parentChildEdges) {
    if (visibleIds.has(edge.parentId) && visibleIds.has(edge.childId)) {
      edges.push({
        id: `pc-${edge.parentId}-${edge.childId}`,
        kind: "parent_child",
        source: edge.parentId,
        target: edge.childId,
      });
    }
  }
  for (const edge of input.partnershipEdges) {
    if (visibleIds.has(edge.person1Id) && visibleIds.has(edge.person2Id)) {
      edges.push({
        id: `partner-${edge.person1Id}-${edge.person2Id}`,
        kind: "partnership",
        source: edge.person1Id,
        target: edge.person2Id,
        isCurrent: edge.isCurrent,
      });
    }
  }

  return { nodes, edges, focusPersonId };
}

function groupBy<T, K, V>(
  items: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => V,
): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(valueFn(item));
  }
  return map;
}

/**
 * Two people joined as partners/siblings should share one "remaining
 * traversal budget" going forward — whichever of the pair has already used
 * less of their budget (i.e. has more depth left, or wasn't budgeted yet)
 * wins for both, since real family membership doesn't reset at a marriage.
 * Returns true if either side's budget changed (i.e. more BFS work to do).
 */
function mergeBudget(
  depthOf: Map<string, number>,
  id1: string,
  id2: string,
): boolean {
  const depth1 = depthOf.get(id1);
  const depth2 = depthOf.get(id2);
  if (depth1 === undefined && depth2 === undefined) return false;
  const merged = Math.min(depth1 ?? Infinity, depth2 ?? Infinity);
  let changed = false;
  if (depth1 === undefined || depth1 > merged) {
    depthOf.set(id1, merged);
    changed = true;
  }
  if (depth2 === undefined || depth2 > merged) {
    depthOf.set(id2, merged);
    changed = true;
  }
  return changed;
}

/** Keeps partners adjacent within a generation row instead of scattering them arbitrarily. */
function orderByPartnership(
  ids: string[],
  partnershipEdges: PartnershipEdgeInput[],
): string[] {
  const partnerOf = new Map<string, string>();
  for (const { person1Id, person2Id } of partnershipEdges) {
    partnerOf.set(person1Id, person2Id);
    partnerOf.set(person2Id, person1Id);
  }

  const idSet = new Set(ids);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    ordered.push(id);
    seen.add(id);
    const partnerId = partnerOf.get(id);
    if (partnerId && idSet.has(partnerId) && !seen.has(partnerId)) {
      ordered.push(partnerId);
      seen.add(partnerId);
    }
  }

  return ordered;
}
