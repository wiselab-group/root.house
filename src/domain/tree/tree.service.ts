import { db } from "@/db/client";
import {
  relationshipsParentChild,
  relationshipsPartnership,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import { buildFocusTreeLayout, type PersonNode } from "./tree-layout.builder";
import type { TreeLayoutGraph } from "./tree-layout.builder";
import { applyFilter, type FilterMode, type FilteredTreeLayoutGraph, type PersonFilter } from "./tree-filter";

export interface GetFocusTreeLayoutOptions {
  /** Generations of ancestors to include above focusPersonId (plan §8 "expand ancestors"). Defaults to buildFocusTreeLayout's own default (2). */
  ancestorGenerations?: number;
  /** Generations of descendants to include below focusPersonId (plan §8 "expand descendants"). Defaults to buildFocusTreeLayout's own default (2). */
  descendantGenerations?: number;
  /** Filter/Focus layer (plan §7) — applied to the built layout, never to the underlying genealogy structure. */
  filter?: PersonFilter;
  filterMode?: FilterMode;
}

/**
 * Assembles a family's full Person+Relationship graph and runs it through
 * buildFocusTreeLayout(), then (optionally) tree-filter.ts's applyFilter().
 * This is the only place that bridges the database to the (library-agnostic)
 * layout builder — components/tree/* never touch the database directly.
 *
 * Returns a plain TreeLayoutGraph when no filter is requested (unchanged
 * shape, so every existing caller keeps working untouched) and a
 * FilteredTreeLayoutGraph (adds matchedIds/mode) once a filter is passed.
 */
export async function getFocusTreeLayout(
  familyId: string,
  focusPersonId: string,
  options?: GetFocusTreeLayoutOptions,
): Promise<TreeLayoutGraph | FilteredTreeLayoutGraph> {
  const [persons, parentChildRows, partnershipRows] = await Promise.all([
    listPersonsByFamily(familyId),
    db.query.relationshipsParentChild.findMany({
      where: eq(relationshipsParentChild.familyId, familyId),
      columns: { parentId: true, childId: true },
    }),
    db.query.relationshipsPartnership.findMany({
      where: eq(relationshipsPartnership.familyId, familyId),
      columns: { person1Id: true, person2Id: true, isCurrent: true },
    }),
  ]);

  const personNodes: PersonNode[] = persons.map((p) => ({
    id: p.id,
    slug: p.slug,
    firstName: p.firstName,
    lastName: p.lastName,
    nickname: p.nickname,
    isPlaceholder: p.isPlaceholder,
    isLiving: p.isLiving,
    birthYear: p.birthDate?.year ?? null,
    deathYear: p.deathDate?.year ?? null,
    photoMediaId: p.photoMediaId,
    gender: p.gender,
    religion: p.religion,
    nationality: p.nationality,
  }));

  const graph = buildFocusTreeLayout({
    persons: personNodes,
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
    focusPersonId,
    ancestorGenerations: options?.ancestorGenerations,
    descendantGenerations: options?.descendantGenerations,
  });

  if (!options?.filter) return graph;
  return applyFilter(graph, options.filter, options.filterMode);
}
