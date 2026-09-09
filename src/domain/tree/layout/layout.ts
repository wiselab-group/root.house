import type {
  FamilyGraph,
  LaidOutPartnership,
  LaidOutPerson,
  TreeLayoutResult,
} from "./types";
import { normalizeGraph, raiseAncestryOneGeneration } from "./graph";
import {
  placeGraph,
  findStrandedOnlyChildren,
  straightenAncestorConnectors,
} from "./placement";
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
 * buildTreeLayout — the single public entry point into the genealogy
 * layout pipeline: normalize → measure (bottom-up, inside placeGraph) →
 * place → validate geometry. Returns a library-agnostic result — no React
 * Flow here; production wiring lives in src/domain/tree/tree-adapter.ts
 * (DB rows → FamilyGraph → this function → TreeLayoutGraph), consumed by
 * src/components/tree/adapters/xyflow-adapter.ts.
 */
export function buildTreeLayout(
  graph: FamilyGraph,
  focusPersonId: string,
): TreeLayoutResult {
  const normalized = normalizeGraph(graph, focusPersonId);
  let { positionByPerson, junctionByPartnership } = placeGraph(normalized);

  // An "unpulled only child" (real parentIds, no children of her own, no
  // sibling recorded either — see placement.ts) can land on her natural BFS
  // generation row only to find that row already belongs entirely to an
  // unrelated branch (e.g. Natalya Ushkar landing on Viktor/Galina's
  // crowded row, ~1450px from her own parents). No amount of anchor-tuning
  // within that single row can fix this — the row itself is wrong for her.
  // Retry once: raise her AND her entire ancestry (parent + all of the
  // parent's own recorded ancestors) one generation each, which moves her
  // off the crowded row and lands her one row up, right beside her own
  // (also-raised) parents instead. `generation` is
  // documented as a "soft hint for Y, never a hardcoded row" precisely to
  // allow this kind of per-branch adjustment. One retry only (not a loop
  // until stable) — re-raising is not expected to be needed in practice,
  // and looping indefinitely on a graph shape that can't stabilize would
  // hang instead of failing loudly.
  const stranded = findStrandedOnlyChildren(normalized, positionByPerson);
  if (stranded.length > 0) {
    for (const personId of stranded) {
      raiseAncestryOneGeneration(normalized, personId);
    }
    ({ positionByPerson, junctionByPartnership } = placeGraph(normalized));
  }

  // Final pass, once every position (including the stranded-only-child
  // retry above) is fully resolved: when a couple has exactly one blood
  // spouse (parents recorded above them) and one in-law (none), and the
  // in-law happens to have landed physically closer to that ancestor pair's
  // own descending connector than the blood spouse did, swap the two so the
  // line reaches the blood spouse's card cleanly instead of clipping the
  // unrelated in-law's, then recenter that blood spouse's own parents over
  // their (now different) full sibling row. See placement.ts's
  // straightenAncestorConnectors.
  straightenAncestorConnectors(
    normalized,
    positionByPerson,
    junctionByPartnership,
  );

  assertOnePositionPerPerson(normalized, positionByPerson);
  assertNoOverlaps(positionByPerson);

  const persons: LaidOutPerson[] = [...normalized.personById.values()].map(
    (p) => {
      const pos = positionByPerson.get(p.id);
      if (!pos) {
        throw new Error(
          `buildTreeLayout: person "${p.id}" was not placed (unsupported graph shape)`,
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
