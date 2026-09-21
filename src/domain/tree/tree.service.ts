import { db } from "@/db/client";
import {
  relationshipsParentChild,
  relationshipsPartnership,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import type { ActingMember } from "@/domain/family/permissions";
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
import {
  getPersonArchiveSummaries,
  EMPTY_ARCHIVE_SUMMARY,
} from "./archive-summary";

export type TreeRows = Awaited<ReturnType<typeof fetchTreeRows>>;

/**
 * Fetches everything getFocusTreeLayout/getRawTreeGraph both need —
 * persons, both relationship tables, and the archive-summary aggregate
 * (archive-summary.ts) — in one batch. Exported (not the two functions'
 * own private helper) so the tree page can call it exactly ONCE per page
 * load and hand the same TreeRows to both getFocusTreeLayout and
 * getRawTreeGraph, instead of each independently re-fetching (which used
 * to double every query here, archive-summary's 3 queries included — see
 * git history around 2026-09-21 for the version that duplicated them).
 */
export async function fetchTreeRows(familyId: string, viewer: ActingMember) {
  const [persons, parentChildRows, partnershipRows, archiveByPersonId] =
    await Promise.all([
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
      getPersonArchiveSummaries(familyId, viewer),
    ]);
  return {
    familyId,
    persons,
    parentChildRows,
    partnershipRows,
    archiveByPersonId,
  };
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
 * Takes an already-fetched TreeRows rather than familyId/viewer itself —
 * the tree page fetches once (fetchTreeRows) and passes the SAME rows to
 * both this function and getRawTreeGraph below, so a single page load never
 * runs the underlying queries (archive-summary's 3 aggregates included)
 * twice. focusPersonId is the only thing that varies per call (the client-
 * side re-focus path, buildClientTreeLayout, mirrors this split too).
 *
 * Returns a plain TreeLayoutGraph when no filter is requested (unchanged
 * shape, so every existing caller keeps working untouched) and a
 * FilteredTreeLayoutGraph (adds matchedIds/mode) once a filter is passed.
 */
export function getFocusTreeLayout(
  rows: TreeRows,
  focusPersonId: string,
  options?: GetFocusTreeLayoutOptions,
): TreeLayoutGraph | FilteredTreeLayoutGraph {
  const {
    familyId,
    persons,
    parentChildRows,
    partnershipRows,
    archiveByPersonId,
  } = rows;

  const { graph, personById: personRecordById } = toTreeFamilyGraph({
    persons,
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
  });
  // fromTreeLayout reads PersonNode.archive off each record — join the
  // batched archive-summary map on here rather than widening
  // toTreeFamilyGraph's own generic (which buildClientTreeLayout also uses,
  // with PersonRecord/TreePersonClientPayload never carrying archive counts
  // pre-join).
  const personById = new Map(
    [...personRecordById].map(([id, record]) => [
      id,
      {
        ...record,
        archive: archiveByPersonId.get(id) ?? EMPTY_ARCHIVE_SUMMARY,
      },
    ]),
  );

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
 * Shapes the same TreeRows getFocusTreeLayout takes (see its own doc
 * comment — both are handed the SAME fetchTreeRows result by the tree page,
 * so the underlying queries only ever run once per page load) down to the
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
export function getRawTreeGraph(rows: TreeRows): TreeClientGraphPayload {
  const { persons, parentChildRows, partnershipRows, archiveByPersonId } = rows;

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
      archive: archiveByPersonId.get(p.id) ?? EMPTY_ARCHIVE_SUMMARY,
    })),
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
  };
}
