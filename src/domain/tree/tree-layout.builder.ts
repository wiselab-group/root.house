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

  collectByBfs(
    focusPersonId,
    ancestorGenerations,
    generationOf,
    (id) => parentsOf.get(id) ?? [],
    -1,
  );
  collectByBfs(
    focusPersonId,
    descendantGenerations,
    generationOf,
    (id) => childrenOf.get(id) ?? [],
    1,
  );

  // Siblings of the focus person (other children of any of their parents)
  // join at generation 0 — parent_child BFS alone never finds them, since
  // they aren't an ancestor or descendant of the focus person.
  for (const parentId of parentsOf.get(focusPersonId) ?? []) {
    for (const siblingId of childrenOf.get(parentId) ?? []) {
      if (!generationOf.has(siblingId)) {
        generationOf.set(siblingId, 0);
      }
    }
  }

  // Partners of anyone already in the visible set join at the same generation.
  for (const { person1Id, person2Id } of input.partnershipEdges) {
    if (generationOf.has(person1Id) && !generationOf.has(person2Id)) {
      generationOf.set(person2Id, generationOf.get(person1Id)!);
    } else if (generationOf.has(person2Id) && !generationOf.has(person1Id)) {
      generationOf.set(person1Id, generationOf.get(person2Id)!);
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
 * BFS outward from `startId` up to `maxGenerations` steps, recording each
 * visited id's generation offset (multiplied by `direction`: -1 for
 * ancestors going up, +1 for descendants going down) into `generationOf`.
 */
function collectByBfs(
  startId: string,
  maxGenerations: number,
  generationOf: Map<string, number>,
  neighborsOf: (id: string) => string[],
  direction: -1 | 1,
): void {
  let frontier = [startId];
  for (let depth = 1; depth <= maxGenerations; depth++) {
    const nextFrontier: string[] = [];
    for (const id of frontier) {
      for (const neighborId of neighborsOf(id)) {
        if (generationOf.has(neighborId)) continue;
        generationOf.set(neighborId, depth * direction);
        nextFrontier.push(neighborId);
      }
    }
    if (nextFrontier.length === 0) break;
    frontier = nextFrontier;
  }
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
