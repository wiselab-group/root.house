import type { NormalizedGraph, Point } from "./types";
import {
  createGrowthContext,
  growBranch,
  growInLawAncestors,
  repairSideConstraintViolations,
} from "./subtree";

export interface PlacementResult {
  positionByPerson: Map<string, Point>;
  junctionByPartnership: Map<string, Point>;
}

/**
 * placeGraph — the layout engine's single entry point. Implements the
 * "growing tree" model end to end:
 *
 *   1. Place the focus person at the origin, then grow their descendants
 *      downward (growBranch("down")).
 *   2. Grow the focus's own ancestors upward (growBranch("up")) — parent
 *      pair by parent pair, each pair's sibling row completed first so the
 *      pair centers over the FULL row, recursing to grandparents and beyond.
 *   3. Sweep for in-law ancestors: any already-placed person (a descendant's
 *      spouse, a newly-grown sibling) whose OWN recorded parents aren't
 *      placed yet gets their ancestry grown too, iterated to a fixed point.
 *
 * Rewrite plan §7 Stage 3: both directions now share ONE recursive primitive
 * (subtree.ts's growBranch) instead of "down" being a clean measure-then-
 * place recursion while "up" was a separate ~1700-line row-by-row model with
 * its own collision/centering/remarriage logic reimplemented in parallel —
 * this file used to also contain placeAncestors/placeAncestorUnit/
 * placeUnplacedSiblings/resolveSymmetricOverlaps/placeInLawAncestors/
 * findStrandedOnlyChildren/straightenAncestorConnectors/
 * recenterParentsOnChildren (~24 functions across ~1700 lines, each encoding
 * a specific historically-found bug — see this file's git history and the
 * pre-rewrite CLAUDE.md "TREE LAYOUT RULES" section for the full record).
 * subtree.ts's growPersonBranchUp/placeAncestorUnit/growSiblingRow/
 * growSpouseOwnPartnershipsUp now cover the same ground by construction:
 *
 *   - resolveSymmetricOverlaps (up-front pairwise idealX conflict
 *     resolution, one array pass before any placement) is no longer a
 *     separate pass — two ancestor units competing for the same space is
 *     now an ordinary occupancy collision, resolved by findFreeInterval's
 *     existing outward search exactly like any other branch-vs-branch
 *     collision, never a special one-time reconciliation step.
 *   - placeUnplacedSiblings' spouse-toward-anchor direction logic is
 *     replaced by growSiblingRow, which reuses growChildrenRowDown's own
 *     already-correct partnership-atomic placement (a sibling and their
 *     spouse are ALWAYS placed together, by the same code path a child row
 *     already used) instead of a parallel implementation that had to
 *     separately special-case which side of the anchor a spouse "needs".
 *   - straightenAncestorConnectors/recenterParentsOnChildren existed only to
 *     patch mis-centered parents AFTER the fact (post-hoc collision-driven
 *     correction) — growPersonBranchUp computes a parent pair's center from
 *     the COMPLETE sibling row up front (step 1 before step 2, see its own
 *     doc comment), so there is no mis-centered intermediate state to later
 *     detect and straighten.
 *   - findStrandedOnlyChildren + raiseAncestryOneGeneration (the old
 *     two-pass placeGraph retry) existed because a rigid Y = generation *
 *     GENERATION_GAP left no room for a single row to be "the wrong place"
 *     for an unpulled only child once her natural BFS row was already
 *     entirely occupied by an unrelated family — that whole class of
 *     problem is a Y-axis rigidity question, out of scope for Stage 3
 *     (ancestor placement). Stage 4 (elastic Y — rewrite plan §7) replaces
 *     it with repairSideConstraintViolations (subtree.ts), a bounded local
 *     Y-nudge applied as a post-placement repair pass (see this function's
 *     own final step below) instead of a discrete whole-generation jump +
 *     full-graph retry.
 */
export function placeGraph(graph: NormalizedGraph): PlacementResult {
  const ctx = createGrowthContext(graph);
  const { positionByPerson, junctionByPartnership } = ctx;

  const focusId = graph.focusPersonId;
  growBranch(ctx, focusId, "down", { x: 0, y: 0 });
  growBranch(ctx, focusId, "up", { x: 0, y: 0 });

  // growBranch("up") above only walks the FOCUS's own ancestor chain. A
  // descendant branch can carry an in-law spouse who has real parentIds of
  // their own recorded in the graph — e.g. Viktor Kupchik (a descendant of
  // the focus) partners Galina Kupchik, whose own parents (Nikolai/Nadezhda
  // Kozlovsky) are real, graphed people, reached via a DOWNWARD path from
  // the focus, never visited by the focus's own upward walk. Real bug found
  // while debugging the Kupchik family's real Neon data (per this file's own
  // rule: reproduce on real data, not just synthetic fixtures) — Vera
  // Artyukh (another of Nikolai/Nadezhda's children) surfaced it first as
  // "person has no position".
  growInLawAncestors(ctx);

  // Rewrite plan §7 Stage 4: a bounded, local, post-placement repair for the
  // "two mutually unrelated same-branch clusters land on the same row in
  // the wrong relative order" class of bug — see
  // repairSideConstraintViolations' own doc comment for why this can't be
  // prevented during placement itself (growSiblingRow/growPersonBranchDown
  // compute positions via cursor arithmetic, not an occupancy search, so
  // there's no single search call to validate against).
  repairSideConstraintViolations(ctx);

  return { positionByPerson, junctionByPartnership };
}
