import type { PersonRecord } from "@/domain/person/person.repository";
import type { GenealogyGraph } from "./genealogy-graph";
import { deriveSiblings } from "./sibling-derivation";
import {
  computeRelationshipPath,
  type BloodRelationLabel,
  type RelationshipPathResult,
} from "./relationship-path";
import type { ParentChildRecord, PartnershipRecord } from "./relationship.repository";

/**
 * genealogy-algorithms.ts — the core traversal/query API over a GenealogyGraph.
 * Pure functions, no database access, no @xyflow/react — everything here
 * operates on the in-memory graph built by buildGenealogyGraph(). This is
 * what Focus Mode expand, Relationship Trace, and any future UI that needs
 * "who are X's ancestors" should call — not re-derive by hand.
 *
 * Naming/signatures follow the plan's §3 list (getParents/getChildren/
 * getPartners/getSiblings/getAncestors/getDescendants/findCommonAncestors/
 * findRelationshipPath/calculateRelationship) adapted to this codebase's
 * existing PersonRecord/ParentChildRecord/PartnershipRecord shapes.
 */

const DEFAULT_MAX_GENERATIONS = 25; // mirrors graph.service.ts's DEFAULT_MAX_DEPTH — guards pathological data, not a real limit

export interface ParentOf {
  person: PersonRecord;
  parentRole: ParentChildRecord["parentRole"];
}

export interface ChildOf {
  person: PersonRecord;
  parentRole: ParentChildRecord["parentRole"];
}

export interface PartnerOf {
  person: PersonRecord;
  partnership: PartnershipRecord;
}

export interface SiblingOf {
  person: PersonRecord;
  /** 2 = full sibling (both parents shared), 1 = half-sibling. */
  sharedParentCount: number;
}

/** Direct parents of `personId`, with the role each parent has (biological/adoptive/step/foster/unknown). */
export function getParents(graph: GenealogyGraph, personId: string): ParentOf[] {
  const edges = graph.parentEdgesOf.get(personId) ?? [];
  return edges
    .map((edge) => {
      const parent = graph.personsById.get(edge.parentId);
      return parent ? { person: parent, parentRole: edge.parentRole } : null;
    })
    .filter((x): x is ParentOf => x !== null);
}

/** Direct children of `personId`, with the role `personId` has for each. */
export function getChildren(graph: GenealogyGraph, personId: string): ChildOf[] {
  const edges = graph.childEdgesOf.get(personId) ?? [];
  return edges
    .map((edge) => {
      const child = graph.personsById.get(edge.childId);
      return child ? { person: child, parentRole: edge.parentRole } : null;
    })
    .filter((x): x is ChildOf => x !== null);
}

/** Every partner `personId` has ever had (current or past — see partnership.status/isCurrent to distinguish). */
export function getPartners(graph: GenealogyGraph, personId: string): PartnerOf[] {
  const edges = graph.partnershipEdgesOf.get(personId) ?? [];
  return edges
    .map((edge) => {
      const otherId = edge.person1Id === personId ? edge.person2Id : edge.person1Id;
      const other = graph.personsById.get(otherId);
      return other ? { person: other, partnership: edge } : null;
    })
    .filter((x): x is PartnerOf => x !== null);
}

/**
 * Everyone who shares at least one parent with `personId`. Siblings are
 * never stored (see sibling-derivation.ts's module doc) — this reuses that
 * exact pure algorithm over the graph's parent_child edges rather than
 * re-deriving the logic.
 */
export function getSiblings(graph: GenealogyGraph, personId: string): SiblingOf[] {
  const allEdges = [...graph.parentEdgesOf.values(), ...graph.childEdgesOf.values()]
    .flat()
    .map((e) => ({ parentId: e.parentId, childId: e.childId }));
  // parentEdgesOf and childEdgesOf both reference the same underlying rows
  // (each edge appears once per side) — dedupe by id before deriving.
  const dedup = new Map(allEdges.map((e) => [`${e.parentId}-${e.childId}`, e]));

  return deriveSiblings(personId, [...dedup.values()])
    .map(({ personId: siblingId, sharedParentCount }) => {
      const sibling = graph.personsById.get(siblingId);
      return sibling ? { person: sibling, sharedParentCount } : null;
    })
    .filter((x): x is SiblingOf => x !== null);
}

/**
 * BFS ancestor-depth map for `personId`: depth 1 = direct parent, 2 =
 * grandparent, etc. In-memory equivalent of graph.service.ts's
 * getAncestorDepths() SQL CTE — used here because callers (Focus Mode
 * expand, Relationship Trace) already have the full family graph loaded and
 * shouldn't round-trip to the database on every UI interaction.
 */
function ancestorDepths(graph: GenealogyGraph, personId: string, maxGenerations: number): Map<string, number> {
  const depths = new Map<string, number>();
  let frontier = [personId];
  for (let depth = 1; depth <= maxGenerations && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.parentEdgesOf.get(id) ?? []) {
        if (!depths.has(edge.parentId)) {
          depths.set(edge.parentId, depth);
          next.push(edge.parentId);
        }
      }
    }
    frontier = next;
  }
  return depths;
}

function descendantDepths(graph: GenealogyGraph, personId: string, maxGenerations: number): Map<string, number> {
  const depths = new Map<string, number>();
  let frontier = [personId];
  for (let depth = 1; depth <= maxGenerations && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.childEdgesOf.get(id) ?? []) {
        if (!depths.has(edge.childId)) {
          depths.set(edge.childId, depth);
          next.push(edge.childId);
        }
      }
    }
    frontier = next;
  }
  return depths;
}

export interface GenerationalRelative {
  person: PersonRecord;
  /** 1 = parent/child, 2 = grandparent/grandchild, ... */
  generationsAway: number;
}

export interface AncestorDescendantOptions {
  /** How many generations up/down to traverse. Default 25 (effectively "all"). */
  maxGenerations?: number;
}

/** All ancestors of `personId` (parents, grandparents, ...) with their generational distance. */
export function getAncestors(
  graph: GenealogyGraph,
  personId: string,
  options: AncestorDescendantOptions = {},
): GenerationalRelative[] {
  const depths = ancestorDepths(graph, personId, options.maxGenerations ?? DEFAULT_MAX_GENERATIONS);
  return [...depths.entries()]
    .map(([id, generationsAway]) => {
      const person = graph.personsById.get(id);
      return person ? { person, generationsAway } : null;
    })
    .filter((x): x is GenerationalRelative => x !== null);
}

/** All descendants of `personId` (children, grandchildren, ...) with their generational distance. */
export function getDescendants(
  graph: GenealogyGraph,
  personId: string,
  options: AncestorDescendantOptions = {},
): GenerationalRelative[] {
  const depths = descendantDepths(graph, personId, options.maxGenerations ?? DEFAULT_MAX_GENERATIONS);
  return [...depths.entries()]
    .map(([id, generationsAway]) => {
      const person = graph.personsById.get(id);
      return person ? { person, generationsAway } : null;
    })
    .filter((x): x is GenerationalRelative => x !== null);
}

export interface CommonAncestor {
  person: PersonRecord;
  /** Generations from A up to this ancestor. */
  depthFromA: number;
  /** Generations from B up to this ancestor. */
  depthFromB: number;
}

/**
 * Every shared ancestor of A and B (not just the lowest/closest one — see
 * findRelationshipPath for "the" relevant common ancestor used to describe
 * the relationship). Useful for e.g. showing "3 shared ancestors" in a UI.
 */
export function findCommonAncestors(
  graph: GenealogyGraph,
  personAId: string,
  personBId: string,
  options: AncestorDescendantOptions = {},
): CommonAncestor[] {
  const maxGenerations = options.maxGenerations ?? DEFAULT_MAX_GENERATIONS;
  const depthsA = ancestorDepths(graph, personAId, maxGenerations);
  const depthsB = ancestorDepths(graph, personBId, maxGenerations);

  const common: CommonAncestor[] = [];
  for (const [id, depthFromA] of depthsA) {
    const depthFromB = depthsB.get(id);
    if (depthFromB === undefined) continue;
    const person = graph.personsById.get(id);
    if (person) common.push({ person, depthFromA, depthFromB });
  }
  return common;
}

/**
 * calculateRelationship — "how are A and B related?" delegates entirely to
 * the existing, well-tested computeRelationshipPath() (relationship-path.ts),
 * just fed from the in-memory graph instead of a SQL round-trip. Returns
 * "insufficient data" semantics via the existing "unrelated" label when no
 * shared ancestor exists AND neither person is missing from the graph —
 * see findRelationshipPath below for the explicit unknown-person case.
 */
export function calculateRelationship(
  graph: GenealogyGraph,
  personAId: string,
  personBId: string,
  options: AncestorDescendantOptions = {},
): RelationshipPathResult {
  const maxGenerations = options.maxGenerations ?? DEFAULT_MAX_GENERATIONS;
  const ancestorsA = ancestorDepths(graph, personAId, maxGenerations);
  const ancestorsB = ancestorDepths(graph, personBId, maxGenerations);
  return computeRelationshipPath(personAId, personBId, ancestorsA, ancestorsB);
}

export type PathEdgeKind = "parent_child" | "partnership";
export type PathDirection = "up" | "down";

/**
 * One hop in a relationship path: from `fromId` to `toId` via either a
 * parent_child edge (direction "up" = toId is fromId's parent, "down" =
 * toId is fromId's child) or a partnership edge (no direction concept).
 */
export interface RelationshipPathStep {
  fromId: string;
  toId: string;
  edgeKind: PathEdgeKind;
  direction?: PathDirection;
  parentRole?: ParentChildRecord["parentRole"];
}

export interface RelationshipPathNotFound {
  status: "unrelated" | "insufficient_data";
  personAId: string;
  personBId: string;
}

export interface RelationshipPathFound {
  status: "found";
  personAId: string;
  personBId: string;
  /** Every person on the path, in order from A to B (inclusive of both ends). */
  personIds: string[];
  /** The hops connecting consecutive personIds — one shorter than personIds. */
  steps: RelationshipPathStep[];
  commonAncestorId: string | null;
  relationship: RelationshipPathResult;
}

export type RelationshipPathOutcome = RelationshipPathFound | RelationshipPathNotFound;

/**
 * findRelationshipPath — the product's central function (plan §4): "how is A
 * related to B" answered not just as a label, but as a walkable path of
 * people and the relationship (direction + role) connecting each pair, so a
 * UI can render "A → father → grandfather → grandfather's sister → her son → B"
 * rather than only "second cousin".
 *
 * Returns "insufficient_data" (never a guessed answer) when either person
 * isn't present in the graph at all — ambiguous/missing data is a valid
 * outcome per the plan's §6 validation philosophy, not an error to throw.
 *
 * computeRelationshipPath only ever looks at shared ancestors (it's
 * intentionally blood-only — see relationship-path.ts's module doc), so a
 * married couple with no common ancestor would otherwise come back
 * "unrelated" even though they ARE related — just not by blood. Before
 * giving up, this checks for a direct partnership edge between A and B and
 * reports that as "found" with a "spouse" label and a single partnership
 * step, instead of leaving the (very common) spouse case unresolved.
 */
export function findRelationshipPath(
  graph: GenealogyGraph,
  personAId: string,
  personBId: string,
  options: AncestorDescendantOptions = {},
): RelationshipPathOutcome {
  if (!graph.personsById.has(personAId) || !graph.personsById.has(personBId)) {
    return { status: "insufficient_data", personAId, personBId };
  }

  const maxGenerations = options.maxGenerations ?? DEFAULT_MAX_GENERATIONS;
  const ancestorsA = ancestorDepths(graph, personAId, maxGenerations);
  const ancestorsB = ancestorDepths(graph, personBId, maxGenerations);
  const relationship = computeRelationshipPath(personAId, personBId, ancestorsA, ancestorsB);

  if (relationship.label === "same person") {
    return { status: "found", personAId, personBId, personIds: [personAId], steps: [], commonAncestorId: personAId, relationship };
  }

  if (relationship.commonAncestorId === null) {
    const directPartnership = (graph.partnershipEdgesOf.get(personAId) ?? []).find(
      (edge) => edge.person1Id === personBId || edge.person2Id === personBId,
    );
    if (directPartnership) {
      return {
        status: "found",
        personAId,
        personBId,
        personIds: [personAId, personBId],
        steps: [{ fromId: personAId, toId: personBId, edgeKind: "partnership" }],
        commonAncestorId: null,
        relationship: { label: "spouse", commonAncestorId: null },
      };
    }
    return { status: "unrelated", personAId, personBId };
  }

  const commonAncestorId = relationship.commonAncestorId;
  const upFromA = ancestorChain(graph, personAId, commonAncestorId);
  const upFromB = ancestorChain(graph, personBId, commonAncestorId);

  // A -> ... -> commonAncestor -> ... -> B: upFromA walks up from A (inclusive
  // of A, exclusive of the ancestor's own further-up ancestors), upFromB does
  // the same from B; reversing upFromB (minus the shared ancestor, already the
  // last element of upFromA) and appending gives the full A-to-B chain.
  const personIds = [...upFromA, ...upFromB.slice(0, -1).reverse()];

  const steps: RelationshipPathStep[] = [];
  for (let i = 0; i < personIds.length - 1; i++) {
    const fromId = personIds[i];
    const toId = personIds[i + 1];
    const goingUp = i < upFromA.length - 1;
    // Going up: toId is fromId's parent, so the stored edge is (parent=toId, child=fromId).
    // Going down: fromId is toId's parent, so the stored edge is (parent=fromId, child=toId).
    const edge = goingUp ? findParentEdge(graph, toId, fromId) : findParentEdge(graph, fromId, toId);
    steps.push({
      fromId,
      toId,
      edgeKind: "parent_child",
      direction: goingUp ? "up" : "down",
      parentRole: edge?.parentRole,
    });
  }

  return { status: "found", personAId, personBId, personIds, steps, commonAncestorId, relationship };
}

/** Direct parent_child edge from `parentId` to `childId`, if one exists. */
function findParentEdge(graph: GenealogyGraph, parentId: string, childId: string): ParentChildRecord | undefined {
  return (graph.childEdgesOf.get(parentId) ?? []).find((e) => e.childId === childId);
}

/**
 * Walks from `personId` straight up to `ancestorId` following the single
 * lowest-depth parent at each step (there may be multiple parents at a given
 * depth in complex families — the shortest/first found path to the shared
 * ancestor is picked, which is sufficient for describing "the" relationship
 * path a UI renders; a person can always drill into the Family panel for the
 * full set of parents at any node). Returns [] if unreachable (shouldn't
 * happen given ancestorId came from the depth maps, but guards against
 * inconsistent data instead of throwing).
 */
function ancestorChain(graph: GenealogyGraph, personId: string, ancestorId: string): string[] {
  if (personId === ancestorId) return [personId];

  const depths = ancestorDepths(graph, personId, DEFAULT_MAX_GENERATIONS);
  const targetDepth = depths.get(ancestorId);
  if (targetDepth === undefined) return [];

  const chain = [personId];
  let currentId = personId;
  for (let depth = 1; depth <= targetDepth; depth++) {
    const parents = getParents(graph, currentId);
    // Prefer the parent that is itself on the way to ancestorId (i.e. whose
    // own ancestor-depth to ancestorId is exactly one less than remaining).
    const remaining = targetDepth - depth;
    const next = parents.find((p) => {
      if (p.person.id === ancestorId) return remaining === 0;
      const parentDepths = ancestorDepths(graph, p.person.id, DEFAULT_MAX_GENERATIONS);
      return parentDepths.get(ancestorId) === remaining;
    });
    if (!next) return chain; // inconsistent data — return what we have rather than throwing
    chain.push(next.person.id);
    currentId = next.person.id;
  }
  return chain;
}

export type { BloodRelationLabel, RelationshipPathResult };
