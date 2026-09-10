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
  const { positionByPerson, junctionByPartnership } = placeGraph(normalized);

  // Rewrite plan §7 Stage 3: the old two-pass retry (findStrandedOnlyChildren
  // + raiseAncestryOneGeneration, for an only child whose natural BFS row
  // was entirely occupied by an unrelated family) and the post-hoc
  // straightenAncestorConnectors pass are gone — placement.ts's own doc
  // comment on placeGraph explains why each is no longer needed: the new
  // growBranch("up") primitive computes a parent pair's center from the
  // complete sibling row BEFORE placing them (no mis-centered intermediate
  // state to later detect and fix), and resolves competing ancestor units by
  // ordinary occupancy collision search rather than a separate symmetric
  // pre-pass. The remaining gap from Stage 3 — an only child's natural row
  // being entirely owned by an unrelated family — is resolved by Stage 4
  // (elastic Y): placeGraph's own repairSideConstraintViolations call (see
  // its doc comment in subtree.ts) is a bounded, local, post-placement Y
  // nudge that replaces the old discrete whole-generation retry.

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
