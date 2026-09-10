import type {
  NormalizedGraph,
  Partnership,
  Point,
  SubtreeMeasurement,
} from "./types";
import { OccupancyModel } from "./occupancy";

/**
 * Layout constants — all spacing/size decisions route through these named
 * values so nothing in placement.ts/corridors.ts ever hardcodes a magic
 * number (CLAUDE.md CODE RULES: no raw hardcoded spacing).
 */
export const CARD_WIDTH = 176;
export const CARD_HEIGHT = 176;
export const CARD_HALF_WIDTH = CARD_WIDTH / 2;
export const CARD_HALF_HEIGHT = CARD_HEIGHT / 2;

/** Horizontal gap between spouses inside one partnership. */
export const SPOUSE_GAP = 32;
/** Horizontal gap between adjacent sibling branches. */
export const SIBLING_GAP = 64;
/** Extra horizontal gap between a person's own partnerships (remarriage — each partnership's subtree must stay visually distinct). */
export const REMARRIAGE_GAP = 56;
/**
 * Minimum horizontal gap between two branches that are NOT related to each
 * other but end up on the same row (e.g. two independent grandparent
 * couples) — must be at least 2x SPOUSE_GAP so unrelated lineages read as
 * visually separate even when they don't collide (CLAUDE.md TREE LAYOUT RULES).
 */
export const INTER_FAMILY_GAP = 2 * SPOUSE_GAP;
/**
 * Vertical distance between one generation row's center and the next.
 * Must exceed CARD_HEIGHT (rows are measured center-to-center) plus a
 * visible gap for the connector line between them, or generations would
 * overlap vertically.
 */
export const GENERATION_GAP = CARD_HEIGHT + 64;

/**
 * measureSubtree — computes how much horizontal space a branch (a person, or
 * that person's partnership together with its children) requires BEFORE any
 * placement happens. This is the "subtree = space" principle: descendant
 * width, sibling gaps, and partnership gaps are all folded in bottom-up, so
 * a candidate position can be rejected purely by comparing reserved
 * intervals — no post-hoc collision-driven pushing needed for the common
 * case (§13 of the design brief).
 *
 * Two flavors:
 *  - measurePersonWidth: this person's own subtree, including EVERY
 *    partnership they participate in side by side (remarriage support).
 *  - measurePartnershipWidth: one partnership's own row (both spouses) plus
 *    that partnership's children's combined subtree width.
 *
 * This file is also home to growBranch (below) — the layout engine's rewrite
 * (see the tree-layout-rewrite plan) generalizes this module's measure-then-
 * place pattern into a single direction-agnostic primitive that will
 * eventually replace placement.ts entirely for BOTH descendants ("down",
 * implemented here) and ancestors ("up", landing in a later stage). During
 * the incremental migration, growBranch("down") is a drop-in behavioral
 * equivalent of placement.ts's placePersonBranch/growSpouseOwnPartnerships/
 * placeChildrenRow trio — same output, same collision-avoidance strategy —
 * just consolidated under the shared measure/grow shape the ancestor side
 * will eventually share too.
 */
export function measurePersonWidth(
  graph: NormalizedGraph,
  personId: string,
  memo = new Map<string, SubtreeMeasurement>(),
): SubtreeMeasurement {
  const cacheKey = `person:${personId}`;
  const cached = memo.get(cacheKey);
  if (cached) return cached;

  const person = graph.personById.get(personId);
  if (!person) {
    const empty: SubtreeMeasurement = { ownWidth: 0, totalWidth: 0, depth: 0 };
    memo.set(cacheKey, empty);
    return empty;
  }

  const partnerships = person.partnershipIds
    .map((id) => graph.partnershipById.get(id))
    .filter((p): p is Partnership => Boolean(p));

  const solo = graph.soloParentByPersonId.get(personId);

  if (partnerships.length === 0 && !solo) {
    const result: SubtreeMeasurement = {
      ownWidth: CARD_WIDTH,
      totalWidth: CARD_WIDTH,
      depth: 0,
    };
    memo.set(cacheKey, result);
    return result;
  }

  // Each partnership this person is in becomes its own side-by-side branch
  // (this is the concrete remarriage mechanism — Partnership §27).
  const branchWidths: number[] = [];
  let maxDepth = 0;
  for (const partnership of partnerships) {
    const m = measurePartnershipWidth(graph, partnership.id, memo);
    branchWidths.push(m.totalWidth);
    maxDepth = Math.max(maxDepth, m.depth + 1);
  }
  if (solo) {
    const m = measureChildrenRowWidth(graph, solo.childrenIds, memo);
    branchWidths.push(Math.max(CARD_WIDTH, m.totalWidth));
    maxDepth = Math.max(maxDepth, m.depth + 1);
  }

  const totalWidth =
    branchWidths.reduce((a, b) => a + b, 0) +
    REMARRIAGE_GAP * Math.max(0, branchWidths.length - 1);

  const result: SubtreeMeasurement = {
    ownWidth: CARD_WIDTH,
    totalWidth: Math.max(CARD_WIDTH, totalWidth),
    depth: maxDepth,
  };
  memo.set(cacheKey, result);
  return result;
}

export function measurePartnershipWidth(
  graph: NormalizedGraph,
  partnershipId: string,
  memo = new Map<string, SubtreeMeasurement>(),
): SubtreeMeasurement {
  const cacheKey = `partnership:${partnershipId}`;
  const cached = memo.get(cacheKey);
  if (cached) return cached;

  const partnership = graph.partnershipById.get(partnershipId);
  if (!partnership) {
    const empty: SubtreeMeasurement = { ownWidth: 0, totalWidth: 0, depth: 0 };
    memo.set(cacheKey, empty);
    return empty;
  }

  const ownWidth = CARD_WIDTH * 2 + SPOUSE_GAP;
  const childrenMeasurement = measureChildrenRowWidth(
    graph,
    partnership.childrenIds,
    memo,
  );

  const result: SubtreeMeasurement = {
    ownWidth,
    totalWidth: Math.max(ownWidth, childrenMeasurement.totalWidth),
    depth:
      childrenMeasurement.depth + (partnership.childrenIds.length > 0 ? 1 : 0),
  };
  memo.set(cacheKey, result);
  return result;
}

/**
 * A children row's total width is the sum of each child's OWN subtree width
 * (which may recurse arbitrarily deep — a single large sibling branch
 * doesn't get squeezed to the same width as a childless sibling, §12/§13),
 * plus a sibling gap between each.
 */
function measureChildrenRowWidth(
  graph: NormalizedGraph,
  childrenIds: string[],
  memo: Map<string, SubtreeMeasurement>,
): SubtreeMeasurement {
  if (childrenIds.length === 0) {
    return { ownWidth: 0, totalWidth: 0, depth: 0 };
  }
  const widths = childrenIds.map((id) => measurePersonWidth(graph, id, memo));
  const totalWidth =
    widths.reduce((sum, w) => sum + w.totalWidth, 0) +
    SIBLING_GAP * Math.max(0, widths.length - 1);
  const depth = Math.max(...widths.map((w) => w.depth));
  return { ownWidth: totalWidth, totalWidth, depth };
}

// ---------------------------------------------------------------------------
// growBranch — unified place-as-you-grow primitive (rewrite Stage 1: "down"
// only). See this file's own header comment for the plan this serves.
// ---------------------------------------------------------------------------

export type GrowDirection = "down" | "up";

/** Mutable, shared placement state threaded through one growBranch("down") call tree — mirrors placement.ts's own parameter list, just grouped into one object so the recursive helpers below don't each carry six positional params. */
export interface GrowthContext {
  graph: NormalizedGraph;
  occupancy: OccupancyModel;
  positionByPerson: Map<string, Point>;
  junctionByPartnership: Map<string, Point>;
  memo: Map<string, SubtreeMeasurement>;
}

export function createGrowthContext(graph: NormalizedGraph): GrowthContext {
  return {
    graph,
    occupancy: new OccupancyModel(),
    positionByPerson: new Map(),
    junctionByPartnership: new Map(),
    memo: new Map(),
  };
}

/**
 * growBranch — places one branch (a person, together with every partnership/
 * solo-parenthood they participate in, recursing into every child) starting
 * from `anchor`. Only `direction: "down"` (descendants) is implemented in
 * this stage — ancestors ("up") still go through placement.ts's own
 * placeAncestors/placeInLawAncestors until a later migration stage ports
 * them onto this same primitive (see rewrite plan §7 Stage 3).
 *
 * Behaviorally identical to the pre-rewrite trio it replaces:
 * placePersonBranch (this person + every partnership, side by side) →
 * placeChildrenRow (each partnership's children, centered under the
 * partnership) → growSpouseOwnPartnerships (a spouse's OTHER partnerships,
 * grown outward from their own fixed position — the concrete remarriage
 * mechanism). Kept as three cooperating inner functions here for the same
 * reason placement.ts split them: each has a distinctly different anchoring
 * rule (own-anchor vs. row-center vs. spouse-relative), not because they're
 * conceptually separate passes.
 */
export function growBranch(
  ctx: GrowthContext,
  rootId: string,
  direction: GrowDirection,
  anchor: Point,
): void {
  if (direction === "up") {
    throw new Error(
      "growBranch: direction 'up' is not yet implemented — ancestors still go through placement.ts (rewrite Stage 3)",
    );
  }
  growPersonBranchDown(ctx, rootId, anchor.x, anchor.y);
}

function growPersonBranchDown(
  ctx: GrowthContext,
  personId: string,
  anchorX: number,
  y: number,
): void {
  const { graph, occupancy, positionByPerson, junctionByPartnership, memo } =
    ctx;
  if (positionByPerson.has(personId)) return; // already placed via a spouse's branch

  const person = graph.personById.get(personId);
  if (!person) return;

  const partnerships = person.partnershipIds
    .map((id) => graph.partnershipById.get(id))
    .filter((p): p is Partnership => Boolean(p));
  const solo = graph.soloParentByPersonId.get(personId);

  if (partnerships.length === 0 && !solo) {
    positionByPerson.set(personId, { x: anchorX, y });
    occupancy.reserve({ x: anchorX, y, width: CARD_WIDTH, height: CARD_HEIGHT });
    return;
  }

  // Lay out this person's partnership branches side by side, centered on anchorX.
  const branchWidths = [
    ...partnerships.map(
      (p) => measurePartnershipWidth(graph, p.id, memo).totalWidth,
    ),
    ...(solo
      ? [Math.max(CARD_WIDTH, measureSoloWidth(graph, solo.childrenIds, memo))]
      : []),
  ];
  const totalWidth =
    branchWidths.reduce((a, b) => a + b, 0) +
    REMARRIAGE_GAP * Math.max(0, branchWidths.length - 1);

  let cursor = anchorX - totalWidth / 2;
  let personPlaced = false;

  for (let i = 0; i < partnerships.length; i++) {
    const partnership = partnerships[i];
    const width = branchWidths[i];
    const branchCenter = cursor + width / 2;
    cursor += width + REMARRIAGE_GAP;

    const isLeft = partnership.leftPersonId === personId;
    const selfX = isLeft
      ? branchCenter - CARD_WIDTH / 2 - SPOUSE_GAP / 2
      : branchCenter + CARD_WIDTH / 2 + SPOUSE_GAP / 2;
    const spouseId = isLeft
      ? partnership.rightPersonId
      : partnership.leftPersonId;
    const spouseX = isLeft
      ? branchCenter + CARD_WIDTH / 2 + SPOUSE_GAP / 2
      : branchCenter - CARD_WIDTH / 2 - SPOUSE_GAP / 2;

    if (!personPlaced) {
      positionByPerson.set(personId, { x: selfX, y });
      occupancy.reserve({ x: selfX, y, width: CARD_WIDTH, height: CARD_HEIGHT });
      personPlaced = true;
    }
    if (!positionByPerson.has(spouseId)) {
      positionByPerson.set(spouseId, { x: spouseX, y });
      occupancy.reserve({
        x: spouseX,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      });
    }

    const junctionX = (selfX + spouseX) / 2;
    const junctionY = y + CARD_HEIGHT / 2 + GENERATION_GAP / 2;
    junctionByPartnership.set(partnership.id, { x: junctionX, y: junctionY });

    growChildrenRowDown(ctx, partnership.childrenIds, branchCenter, y + GENERATION_GAP);

    // Remarriage: the spouse just placed at spouseX may themselves have
    // OTHER partnerships (not `personId`'s) — grow those outward from the
    // spouse's own fixed position instead of silently skipping them.
    growSpouseOwnPartnershipsDown(ctx, spouseId, partnership.id, spouseX, y);
  }

  if (solo) {
    const width = branchWidths[branchWidths.length - 1];
    const branchCenter = cursor + width / 2;
    if (!personPlaced) {
      positionByPerson.set(personId, { x: branchCenter, y });
      occupancy.reserve({
        x: branchCenter,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      });
    }
    growChildrenRowDown(ctx, solo.childrenIds, branchCenter, y + GENERATION_GAP);
  }
}

function growSpouseOwnPartnershipsDown(
  ctx: GrowthContext,
  spouseId: string,
  placingPartnershipId: string,
  spouseX: number,
  y: number,
): void {
  const { graph, occupancy, positionByPerson, junctionByPartnership } = ctx;
  const spouse = graph.personById.get(spouseId);
  if (!spouse) return;

  const otherPartnershipIds = spouse.partnershipIds.filter(
    (id) => id !== placingPartnershipId,
  );
  for (const partnershipId of otherPartnershipIds) {
    if (junctionByPartnership.has(partnershipId)) continue; // already grown from the other side
    const partnership = graph.partnershipById.get(partnershipId);
    if (!partnership) continue;

    const otherPersonId =
      partnership.leftPersonId === spouseId
        ? partnership.rightPersonId
        : partnership.leftPersonId;
    if (positionByPerson.has(otherPersonId)) continue; // already placed elsewhere — avoid double placement

    const isLeft = partnership.leftPersonId === spouseId;
    const preferredX = isLeft
      ? spouseX + CARD_WIDTH / 2 + SPOUSE_GAP / 2 + CARD_WIDTH / 2
      : spouseX - CARD_WIDTH / 2 - SPOUSE_GAP / 2 - CARD_WIDTH / 2;

    const direction = isLeft ? 1 : -1;
    const resolvedX =
      occupancy.findFreeInterval(
        y,
        CARD_HEIGHT,
        CARD_WIDTH,
        REMARRIAGE_GAP,
        preferredX,
        2000,
      ) ?? preferredX + direction * REMARRIAGE_GAP;
    const otherX = resolvedX;

    positionByPerson.set(otherPersonId, { x: otherX, y });
    occupancy.reserve({ x: otherX, y, width: CARD_WIDTH, height: CARD_HEIGHT });

    const junctionX = (spouseX + otherX) / 2;
    const junctionY = y + CARD_HEIGHT / 2 + GENERATION_GAP / 2;
    junctionByPartnership.set(partnershipId, { x: junctionX, y: junctionY });

    growChildrenRowDown(ctx, partnership.childrenIds, junctionX, y + GENERATION_GAP);
  }
}

function growChildrenRowDown(
  ctx: GrowthContext,
  childrenIds: string[],
  rowCenterX: number,
  y: number,
): void {
  const { graph, occupancy, memo } = ctx;
  if (childrenIds.length === 0) return;

  const widths = childrenIds.map(
    (id) => measurePersonWidth(graph, id, memo).totalWidth,
  );
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) +
    SIBLING_GAP * Math.max(0, widths.length - 1);

  const resolvedCenterX =
    occupancy.findFreeInterval(
      y,
      CARD_HEIGHT,
      totalWidth,
      SIBLING_GAP,
      rowCenterX,
      3000,
    ) ?? rowCenterX;

  let cursor = resolvedCenterX - totalWidth / 2;
  for (let i = 0; i < childrenIds.length; i++) {
    const childWidth = widths[i];
    const childCenter = cursor + childWidth / 2;
    cursor += childWidth + SIBLING_GAP;
    growPersonBranchDown(ctx, childrenIds[i], childCenter, y);
  }
}

function measureSoloWidth(
  graph: NormalizedGraph,
  childrenIds: string[],
  memo: Map<string, SubtreeMeasurement>,
): number {
  if (childrenIds.length === 0) return CARD_WIDTH;
  const widths = childrenIds.map(
    (id) => measurePersonWidth(graph, id, memo).totalWidth,
  );
  return (
    widths.reduce((a, b) => a + b, 0) +
    SIBLING_GAP * Math.max(0, widths.length - 1)
  );
}
