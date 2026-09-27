import type { PersonRecord } from "@/domain/person/person.repository";
import type {
  ParentChildRecord,
  PartnershipRecord,
} from "./relationship.repository";

/**
 * GenealogyGraph — an in-memory, library-agnostic adjacency structure over a
 * family's full Person + Relationship data. NOT a database model (no SQL),
 * NOT a React Flow graph (no @xyflow/react types, no x/y) — a pure lookup
 * structure that the algorithms in genealogy-algorithms.ts traverse.
 *
 * Built once per request from data already fetched by relationship.repository.ts
 * / person.repository.ts (no new queries) — O(1) parent/child/partner lookup
 * instead of re-scanning the flat edge arrays on every call, which matters
 * once findRelationshipPath/getAncestors/getDescendants are called repeatedly
 * (Focus Mode expand, Relationship Trace) within the same request.
 */
export interface GenealogyGraph<
  TPerson extends { id: string } = PersonRecord,
  TParentChild extends PathParentChildEdge = ParentChildRecord,
  TPartnership extends PathPartnershipEdge = PartnershipRecord,
> {
  personsById: Map<string, TPerson>;
  /** childId -> parent_child edges where this person is the child (i.e. their parents). */
  parentEdgesOf: Map<string, TParentChild[]>;
  /** parentId -> parent_child edges where this person is the parent (i.e. their children). */
  childEdgesOf: Map<string, TParentChild[]>;
  /** personId -> partnership edges involving this person (either side). */
  partnershipEdgesOf: Map<string, TPartnership[]>;
}

export type PathParentChildEdge = Pick<
  ParentChildRecord,
  "parentId" | "childId" | "parentRole"
>;
export type PathPartnershipEdge = Pick<
  PartnershipRecord,
  "person1Id" | "person2Id"
>;

/**
 * The narrowest graph findRelationshipPath needs — ids and edge endpoints
 * only. Lets the tree page's client-safe payload (TreeClientGraphPayload,
 * no full PersonRecord) run the same path search in the browser, so
 * picking two people for Relationship Trace needs no server round-trip.
 * A full GenealogyGraph is assignable to it.
 */
export type PathGraph = GenealogyGraph<
  { id: string },
  PathParentChildEdge,
  PathPartnershipEdge
>;

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

/**
 * Builds a GenealogyGraph from a family's full Person + Relationship rows.
 * Callers are expected to pass ALL of a family's persons/edges (as
 * tree.service.ts already does for layout) — algorithms that need only a
 * slice (e.g. Focus Mode's visible set) filter the *graph's output*, not
 * the input, so ancestor/descendant traversal always sees the complete graph.
 */
export function buildGenealogyGraph<
  TPerson extends { id: string },
  TParentChild extends PathParentChildEdge,
  TPartnership extends PathPartnershipEdge,
>(
  persons: TPerson[],
  parentChildEdges: TParentChild[],
  partnershipEdges: TPartnership[],
): GenealogyGraph<TPerson, TParentChild, TPartnership> {
  const personsById = new Map(persons.map((p) => [p.id, p]));
  const parentEdgesOf = new Map<string, TParentChild[]>();
  const childEdgesOf = new Map<string, TParentChild[]>();
  const partnershipEdgesOf = new Map<string, TPartnership[]>();

  for (const edge of parentChildEdges) {
    pushTo(parentEdgesOf, edge.childId, edge);
    pushTo(childEdgesOf, edge.parentId, edge);
  }

  for (const edge of partnershipEdges) {
    pushTo(partnershipEdgesOf, edge.person1Id, edge);
    pushTo(partnershipEdgesOf, edge.person2Id, edge);
  }

  return { personsById, parentEdgesOf, childEdgesOf, partnershipEdgesOf };
}

export function getPerson<TPerson extends { id: string }>(
  graph: GenealogyGraph<TPerson>,
  personId: string,
): TPerson | null {
  return graph.personsById.get(personId) ?? null;
}
