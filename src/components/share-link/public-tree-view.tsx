import { TreeCanvas } from "@/components/tree/tree-canvas";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";

/**
 * Thin Server Component wrapper around the same TreeCanvas the authenticated
 * tree page uses, in `readOnly` mode — no data fetching of its own, the
 * already privacy-filtered TreeLayoutGraph (see
 * domain/share-link/public-tree.service.ts::getPublicTreeLayout) is passed
 * in as a prop by app/share/[token]/page.tsx. No new node/edge type
 * registry — same nodeTypes/edgeTypes as the authenticated canvas.
 */
export function PublicTreeView({
  graph,
  familyId,
  familySlug,
  token,
}: {
  graph: TreeLayoutGraph;
  familyId: string;
  familySlug: string;
  /** This Share Link's own plaintext token — passed down so each card's
   *  avatar photo requests /api/share/[token]/media/[id] instead of the
   *  auth-gated /api/media/[id] (see xyflow-adapter.ts::buildPhotoUrl). */
  token: string;
}) {
  return (
    <TreeCanvas
      graph={graph}
      familyId={familyId}
      familySlug={familySlug}
      readOnly
      shareToken={token}
    />
  );
}
