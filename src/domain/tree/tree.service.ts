import { db } from "@/db/client";
import {
  relationshipsParentChild,
  relationshipsPartnership,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import { buildTreeLayout } from "./layout/layout";
import {
  toTreeFamilyGraph,
  fromTreeLayout,
  type TreeClientGraphPayload,
} from "./tree-adapter";
import type { TreeLayoutGraph } from "./tree-layout.builder";
import {
  applyFilter,
  type FilterMode,
  type FilteredTreeLayoutGraph,
  type PersonFilter,
} from "./tree-filter";

/** The rows getFocusTreeLayout/getRawTreeGraph both need — fetched once so the two never drift out of sync with each other (see getRawTreeGraph's own doc comment). */
async function fetchTreeRows(familyId: string) {
  const [persons, parentChildRows, partnershipRows] = await Promise.all([
    listPersonsByFamily(familyId),
    db.query.relationshipsParentChild.findMany({
      where: eq(relationshipsParentChild.familyId, familyId),
      // parentRole added ahead of the dashed-line (adoptive/step/foster)
      // rendering work — see rewrite plan §5.1. Not yet consumed downstream.
      columns: { id: true, parentId: true, childId: true, parentRole: true },
    }),
    db.query.relationshipsPartnership.findMany({
      where: eq(relationshipsPartnership.familyId, familyId),
      // startDate* added ahead of chronological multi-marriage ordering —
      // see rewrite plan §1.4/§1.6/§5.4. Not yet consumed downstream.
      columns: {
        id: true,
        person1Id: true,
        person2Id: true,
        status: true,
        isCurrent: true,
        startDateYear: true,
        startDateMonth: true,
        startDateDay: true,
        startDateApproximate: true,
      },
    }),
  ]);
  return { persons, parentChildRows, partnershipRows };
}

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
  const { persons, parentChildRows, partnershipRows } =
    await fetchTreeRows(familyId);

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

/**
 * Fetches the same rows getFocusTreeLayout does (fetchTreeRows above, so
 * the two can never drift out of sync with each other), shaped down to the
 * narrow, client-safe TreeClientGraphPayload (rewrite plan §7 Stage 7,
 * tree-adapter.ts's own doc comment on TreePersonClientPayload). This is
 * what lets the tree page hand a Client Component (TreeCanvas) everything
 * it needs to re-run buildTreeLayout locally for a NEW focus person —
 * instant re-focus without a server round-trip or full page reload —
 * instead of every focus switch needing a fresh getFocusTreeLayout call.
 *
 * Deliberately NOT gated by a filter option the way getFocusTreeLayout is —
 * Filter/Focus (tree-filter.ts) is applied to an already-built
 * TreeLayoutGraph, and TreeCanvas's own client-side re-focus re-derives
 * highlight state from the SAME filter/trace props it already has (see its
 * own doc comment) rather than needing this payload to carry filter state
 * too.
 */
export async function getRawTreeGraph(
  familyId: string,
): Promise<TreeClientGraphPayload> {
  const { persons, parentChildRows, partnershipRows } =
    await fetchTreeRows(familyId);

  return {
    persons: persons.map((p) => ({
      id: p.id,
      slug: p.slug,
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: p.nickname,
      gender: p.gender,
      isPlaceholder: p.isPlaceholder,
      isLiving: p.isLiving,
      birthDate: p.birthDate,
      deathDate: p.deathDate,
      photoMediaId: p.photoMediaId,
      religion: p.religion,
      nationality: p.nationality,
    })),
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
  };
}
