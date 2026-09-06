import type { NormalizedGraph, Partnership, SubtreeMeasurement } from "./types";

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
