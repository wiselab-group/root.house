import { db } from "@/db/client";
import {
  relationshipsParentChild,
  relationshipsPartnership,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import { buildTreeLayout } from "./layout/layout";
import { toTreeFamilyGraph, fromTreeLayout } from "./tree-adapter";
import type { TreeLayoutGraph } from "./tree-layout.builder";
import {
  applyFilter,
  type FilterMode,
  type FilteredTreeLayoutGraph,
  type PersonFilter,
} from "./tree-filter";

export interface GetFocusTreeLayoutOptions {
  /**
   * Generations of ancestors to include above focusPersonId. The layout
   * engine (src/domain/tree/layout/) has no windowing — it always lays out
   * the entire connected graph reachable from focus — so this option is
   * currently IGNORED. Kept for API stability; the one call site (the tree
   * page) always passes Infinity anyway.
   */
  ancestorGenerations?: number;
  /** Generations of descendants to include below focusPersonId. Currently IGNORED — see ancestorGenerations. */
  descendantGenerations?: number;
  /** Filter/Focus layer (tree-filter.ts) — applied to the built layout, never to the underlying genealogy structure. */
  filter?: PersonFilter;
  filterMode?: FilterMode;
}

/**
 * Assembles a family's full Person+Relationship graph and runs it through
 * the layout engine (src/domain/tree/layout/, via tree-adapter.ts), then
 * (optionally) tree-filter.ts's applyFilter(). This is the only place that
 * bridges the database to the (library-agnostic) layout contract —
 * components/tree/* never touch the database directly.
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
      columns: { id: true, parentId: true, childId: true },
    }),
    db.query.relationshipsPartnership.findMany({
      where: eq(relationshipsPartnership.familyId, familyId),
      columns: {
        id: true,
        person1Id: true,
        person2Id: true,
        status: true,
        isCurrent: true,
      },
    }),
  ]);

  const { graph, personById } = toTreeFamilyGraph({
    persons,
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
  });

  let result;
  try {
    result = buildTreeLayout(graph, focusPersonId);
  } catch (err) {
    throw new Error(
      `getFocusTreeLayout: layout engine failed for family ${familyId}, focus ${focusPersonId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { cause: err },
    );
  }

  const partnershipIsCurrentById = new Map(
    partnershipRows.map((r) => [r.id, r.isCurrent]),
  );
  const layoutGraph = fromTreeLayout(
    focusPersonId,
    result,
    personById,
    parentChildRows,
    partnershipIsCurrentById,
  );

  if (!options?.filter) return layoutGraph;
  return applyFilter(layoutGraph, options.filter, options.filterMode);
}
