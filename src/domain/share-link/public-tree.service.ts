import { db } from "@/db/client";
import {
  relationshipsParentChild,
  relationshipsPartnership,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  listPersonsByFamily,
  type PersonRecord,
} from "@/domain/person/person.repository";
import { getMediaById } from "@/domain/media/media.repository";
import { buildTreeLayout } from "@/domain/tree/layout/layout";
import { toTreeFamilyGraph, fromTreeLayout } from "@/domain/tree/tree-adapter";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import {
  canViewViaShareLink,
  type ShareLinkVisibilityScope,
} from "./public-visibility";

export class PersonNotPubliclyVisibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonNotPubliclyVisibleError";
  }
}

/**
 * Privacy-filtered sibling of tree.service.ts::getFocusTreeLayout — entirely
 * separate code path (never calls or is called by the authenticated one),
 * so there is no risk of the unfiltered query path leaking into the
 * anonymous surface. Reuses the SAME layout engine (buildTreeLayout) and DB
 * adapter (toTreeFamilyGraph/fromTreeLayout) unmodified.
 *
 * Filtering happens BEFORE the FamilyGraph is built, not after the layout
 * runs — normalizeGraph (src/domain/tree/layout/graph.ts) already drops any
 * relationship edge whose endpoint isn't in the supplied person set, so
 * passing it an already-public-only person list is sufficient: no edge
 * connecting to a non-public person can ever reach the layout engine, and
 * no post-hoc node removal (which would violate the engine's collision/
 * connectivity invariants — see the tree page's own "KNOWN GAP" comment) is
 * needed.
 */
export async function getPublicTreeLayout(
  familyId: string,
  focusPersonId: string,
  visibilityScope: ShareLinkVisibilityScope,
): Promise<TreeLayoutGraph> {
  const [allPersons, parentChildRows, partnershipRows] = await Promise.all([
    listPersonsByFamily(familyId),
    db.query.relationshipsParentChild.findMany({
      where: eq(relationshipsParentChild.familyId, familyId),
      // parentRole/startDate* added ahead of the dashed-line and
      // chronological multi-marriage work — see rewrite plan §1.4/§1.6/§5.1/
      // §5.4. Not yet consumed downstream. Kept in sync with
      // tree.service.ts::getFocusTreeLayout's own column picks.
      columns: { id: true, parentId: true, childId: true, parentRole: true },
    }),
    db.query.relationshipsPartnership.findMany({
      where: eq(relationshipsPartnership.familyId, familyId),
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

  const visiblePersons = allPersons.filter((p) =>
    canViewViaShareLink(p, visibilityScope),
  );

  const focusPerson = visiblePersons.find((p) => p.id === focusPersonId);
  if (!focusPerson) {
    // Defensive re-check — createShareLink already requires the focus
    // person to be visible under this link's own scope at creation time,
    // but privacy can change later (e.g. the owner tightens that person's
    // privacyLevel after issuing the link).
    throw new PersonNotPubliclyVisibleError(
      `focusPersonId "${focusPersonId}" is not (or no longer) visible under scope "${visibilityScope}" in family ${familyId}`,
    );
  }

  const { graph, personById } = toTreeFamilyGraph({
    persons: visiblePersons,
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
  });

  let result;
  try {
    result = buildTreeLayout(graph, focusPersonId);
  } catch (err) {
    throw new Error(
      `getPublicTreeLayout: layout engine failed for family ${familyId}, focus ${focusPersonId}: ${
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

  return redactNonVisiblePhotos(layoutGraph, familyId, visibilityScope);
}

/**
 * A visible Person can still have a photo whose OWN privacyLevel doesn't
 * clear this link's scope (Media has its own independent privacyLevel) —
 * null out photoMediaId on any node whose referenced Media row doesn't
 * itself pass canViewViaShareLink under this same scope, so the anonymous
 * view never leaks a not-visible-under-this-scope image via a raw media URL
 * even though the Person card itself is visible.
 */
async function redactNonVisiblePhotos(
  layoutGraph: TreeLayoutGraph,
  familyId: string,
  visibilityScope: ShareLinkVisibilityScope,
): Promise<TreeLayoutGraph> {
  const photoIds = layoutGraph.nodes
    .map((n) => n.person.photoMediaId)
    .filter((id): id is string => id != null);

  if (photoIds.length === 0) return layoutGraph;

  const uniqueIds = [...new Set(photoIds)];
  const visibility = new Map(
    await Promise.all(
      uniqueIds.map(async (id) => {
        const media = await getMediaById(id, familyId);
        return [
          id,
          media != null && canViewViaShareLink(media, visibilityScope),
        ] as const;
      }),
    ),
  );

  return {
    ...layoutGraph,
    nodes: layoutGraph.nodes.map((n) => {
      const photoMediaId = n.person.photoMediaId;
      if (photoMediaId && !visibility.get(photoMediaId)) {
        return { ...n, person: { ...n.person, photoMediaId: null } };
      }
      return n;
    }),
  };
}

export interface PublicPersonOption {
  id: string;
  name: string;
}

/**
 * For the owner-side "pick the focus person" UI when creating a Share Link
 * — deliberately its own function rather than reusing the auth-gated
 * searchPeopleForTraceAction, since that action always searches the WHOLE
 * family with no privacy filter. Takes the form's currently-selected
 * visibilityScope so the picker only ever offers people who would actually
 * be visible under the link being created.
 */
export async function listPublicPersonOptions(
  familyId: string,
  visibilityScope: ShareLinkVisibilityScope,
): Promise<PublicPersonOption[]> {
  const persons = await listPersonsByFamily(familyId);
  return persons
    .filter((p) => canViewViaShareLink(p, visibilityScope))
    .map(toOption);
}

function toOption(p: PersonRecord): PublicPersonOption {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return { id: p.id, name: name || "Без имени" };
}
