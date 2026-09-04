import type {
  FamilyGraph,
  LaidOutPartnership,
  LaidOutPerson,
  TreeLayoutResult,
} from "./types";
import { normalizeGraph } from "./graph";
import { placeGraph } from "./placement";
import { buildEdgeSpecs } from "./edges";
import { assertNoOverlaps, assertOnePositionPerPerson } from "./collision";

export { buildEdgeSpecs };
export type {
  EdgeSpecs,
  PartnershipEdgeSpec,
  ParentChildEdgeSpec,
} from "./edges";
export type { NormalizedGraph } from "./types";
export * from "./types";

/**
 * tree-v4 — the single public entry point into the genealogy layout
 * pipeline: normalize → measure (bottom-up, inside placeGraph) → place →
 * validate geometry. Returns a library-agnostic result — no React Flow here
 * (see src/components/tree-v4/react-flow-adapter.ts for the only place that
 * converts this into xyflow nodes/edges).
 *
 * This is a from-scratch implementation, independent of tree-v2 and
 * tree-v3 — it does not import from either.
 */
export function buildTreeV4Layout(
  graph: FamilyGraph,
  focusPersonId: string,
): TreeLayoutResult {
  const normalized = normalizeGraph(graph, focusPersonId);
  const { positionByPerson, junctionByPartnership } = placeGraph(normalized);

  assertOnePositionPerPerson(normalized, positionByPerson);
  assertNoOverlaps(positionByPerson);

  const persons: LaidOutPerson[] = [...normalized.personById.values()].map(
    (p) => {
      const pos = positionByPerson.get(p.id);
      if (!pos) {
        throw new Error(
          `buildTreeV4Layout: person "${p.id}" was not placed (unsupported graph shape)`,
        );
      }
      return { ...p, x: pos.x, y: pos.y };
    },
  );

  const partnerships: LaidOutPartnership[] = [
    ...normalized.partnershipById.values(),
  ].map((p) => {
    const junction = junctionByPartnership.get(p.id);
    return { ...p, x: junction?.x ?? 0, y: junction?.y ?? 0 };
  });

  return {
    persons,
    partnerships,
    relationships: normalized.relationships,
    focusPersonId,
  };
}
