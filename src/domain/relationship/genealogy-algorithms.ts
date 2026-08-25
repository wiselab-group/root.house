import type { PersonRecord } from "@/domain/person/person.repository";
import type { GenealogyGraph } from "./genealogy-graph";
import { deriveSiblings } from "./sibling-derivation";
import {
  computeRelationshipPath,
  type BloodRelationLabel,
  type RelationshipLabel,
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
 * intentionally blood-only — see relationship-path.ts's module doc), so two
 * people related only "by marriage" — spouses themselves, or in-laws like "my
 * wife" <-> "my mother" (no shared ancestor, but connected via my own
 * parent_child + partnership edges) — would otherwise come back "unrelated"
 * even though they ARE family. Before giving up, this tries the pure-blood
 * path first (unchanged, so every existing blood-relation label/removal/
 * cousin-degree stays exact); only when that finds no shared ancestor does it
 * fall back to a BFS over the *mixed* graph (parent_child edges in both
 * directions + partnership edges) to find the shortest family path at all,
 * then classifies it as "spouse" (a single partnership hop) or "in_law" (any
 * other path that uses at least one partnership hop).
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

  if (relationship.commonAncestorId !== null) {
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

  // No shared ancestor: fall back to the mixed-graph BFS for spouse / in-law paths.
  const mixedPath = shortestMixedPath(graph, personAId, personBId);
  if (!mixedPath) {
    return { status: "unrelated", personAId, personBId };
  }

  const steps = mixedPathSteps(graph, mixedPath);
  const partnershipHops = steps.filter((s) => s.edgeKind === "partnership").length;

  if (mixedPath.length === 2 && partnershipHops === 1) {
    return {
      status: "found",
      personAId,
      personBId,
      personIds: mixedPath,
      steps,
      commonAncestorId: null,
      relationship: { label: "spouse", commonAncestorId: null },
    };
  }

  // in_law: describe the blood relationship on the far side of the marriage,
  // i.e. swap whichever endpoint is directly across a partnership hop for
  // their partner and re-run the pure-blood classifier from there — e.g.
  // "my wife" <-> "my mother": swap wife for me, then me<->mother is "child",
  // so the UI can render "мать супруга(и)" from inLawBlood: "child".
  const inLawBlood = classifyInLaw(graph, personAId, personBId, mixedPath, ancestorsA, ancestorsB, maxGenerations);

  return {
    status: "found",
    personAId,
    personBId,
    personIds: mixedPath,
    steps,
    commonAncestorId: null,
    relationship: { label: "in_law", commonAncestorId: null, inLawBlood },
  };
}

/**
 * BFS over parent_child (either direction) + partnership edges — the
 * shortest path connecting A and B through *any* family relationship, not
 * just blood. Used only as a fallback once the pure-blood path
 * (findRelationshipPath's common-ancestor branch) has already come back
 * empty, so it doesn't need to special-case "shorter blood path exists" —
 * there isn't one by the time this runs.
 */
function shortestMixedPath(graph: GenealogyGraph, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];

  const visited = new Set([fromId]);
  const cameFrom = new Map<string, string>();
  let frontier = [fromId];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const neighbors = [
        ...(graph.parentEdgesOf.get(id) ?? []).map((e) => e.parentId),
        ...(graph.childEdgesOf.get(id) ?? []).map((e) => e.childId),
        ...(graph.partnershipEdgesOf.get(id) ?? []).map((e) => (e.person1Id === id ? e.person2Id : e.person1Id)),
      ];
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        cameFrom.set(neighborId, id);
        if (neighborId === toId) {
          // Reconstruct and return immediately — BFS guarantees this is shortest.
          const path = [toId];
          let cur = toId;
          while (cur !== fromId) {
            cur = cameFrom.get(cur)!;
            path.push(cur);
          }
          return path.reverse();
        }
        next.push(neighborId);
      }
    }
    frontier = next;
  }
  return null;
}

/** Converts a mixed BFS path (person ids) into typed steps, tagging each hop's edge kind/direction. */
function mixedPathSteps(graph: GenealogyGraph, personIds: string[]): RelationshipPathStep[] {
  const steps: RelationshipPathStep[] = [];
  for (let i = 0; i < personIds.length - 1; i++) {
    const fromId = personIds[i];
    const toId = personIds[i + 1];
    const asParentEdge = findParentEdge(graph, toId, fromId); // toId is fromId's parent
    if (asParentEdge) {
      steps.push({ fromId, toId, edgeKind: "parent_child", direction: "up", parentRole: asParentEdge.parentRole });
      continue;
    }
    const asChildEdge = findParentEdge(graph, fromId, toId); // fromId is toId's parent
    if (asChildEdge) {
      steps.push({ fromId, toId, edgeKind: "parent_child", direction: "down", parentRole: asChildEdge.parentRole });
      continue;
    }
    steps.push({ fromId, toId, edgeKind: "partnership" });
  }
  return steps;
}

/**
 * For an in-law path (>= 1 partnership hop, not the direct-spouse case),
 * finds the blood relationship "on the other side" of the marriage: pick
 * whichever endpoint (A or B) sits immediately across a partnership hop from
 * the rest of the path, swap it for that partner, and classify the
 * (now pure-blood) pair. Falls back to undefined if the path shape is
 * unexpected (e.g. multiple partnership hops) — the UI still shows a generic
 * "in_law" label in that case rather than a wrong specific one.
 */
function classifyInLaw(
  graph: GenealogyGraph,
  personAId: string,
  personBId: string,
  mixedPath: string[],
  ancestorsA: Map<string, number>,
  ancestorsB: Map<string, number>,
  maxGenerations: number,
): BloodRelationLabel | undefined {
  const partnershipIndex = mixedPath.findIndex((id, i) => {
    if (i === mixedPath.length - 1) return false;
    const next = mixedPath[i + 1];
    return (graph.partnershipEdgesOf.get(id) ?? []).some(
      (e) => (e.person1Id === id && e.person2Id === next) || (e.person2Id === id && e.person1Id === next),
    );
  });
  if (partnershipIndex === -1) return undefined;

  // A's endpoint of the partnership hop is at mixedPath[partnershipIndex],
  // B's is at mixedPath[partnershipIndex + 1] (BFS path is already A -> ... -> B).
  const isAtStart = partnershipIndex === 0;
  const isAtEnd = partnershipIndex === mixedPath.length - 2;
  if (!isAtStart && !isAtEnd) return undefined; // more than one partnership hop — ambiguous, skip

  if (isAtStart) {
    // Swap A for their partner at mixedPath[1], classify partner<->B directly.
    const swappedId = mixedPath[1];
    const swappedAncestors = ancestorDepths(graph, swappedId, maxGenerations);
    return asInLawBlood(computeRelationshipPath(swappedId, personBId, swappedAncestors, ancestorsB).label);
  }

  // Swap B for their partner at the second-to-last position, classify A<->partner.
  const swappedId = mixedPath[mixedPath.length - 2];
  const swappedAncestors = ancestorDepths(graph, swappedId, maxGenerations);
  return asInLawBlood(computeRelationshipPath(personAId, swappedId, ancestorsA, swappedAncestors).label);
}

/**
 * computeRelationshipPath's return type is widened to the full
 * RelationshipLabel (it shares RelationshipPathResult with the "spouse"/
 * "in_law" fallback cases in findRelationshipPath), but the function itself
 * only ever actually returns a BloodRelationLabel — this narrows that back
 * down, treating "same person"/"unrelated" (not real blood-relation shapes
 * an in-law phrasing can use) the same as "no swap found".
 */
function asInLawBlood(label: RelationshipLabel): BloodRelationLabel | undefined {
  if (label === "unrelated" || label === "same person" || label === "spouse" || label === "in_law") {
    return undefined;
  }
  return label;
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
