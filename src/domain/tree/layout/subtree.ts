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
 * Elastic Y (rewrite plan §7 Stage 4): how far a single ancestor unit may be
 * nudged off its natural row when the row's own X search is fully exhausted
 * — see occupancy.ts's findFreeSlot and placeAncestorUnit's own doc comment.
 * Expressed as a fraction of GENERATION_GAP so it scales with card size;
 * 0.5 (half a generation row) matches the rewrite plan's own "~1 поколение
 * места" figure (a nudge can go this far in EITHER direction, so the total
 * available slack between two rows fighting over the same space is a full
 * generation, split across both).
 */
const MAX_Y_NUDGE_FRACTION = 0.5;
const MAX_Y_NUDGE = GENERATION_GAP * MAX_Y_NUDGE_FRACTION;
/** Step size for each elastic-Y retry — coarse enough that a handful of steps covers MAX_Y_NUDGE, fine enough not to overshoot past a slot that would have fit. */
const Y_NUDGE_STEP = GENERATION_GAP * 0.15;

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
 * (see the tree-layout-rewrite plan) generalized the old placement.ts's
 * measure-then-place pattern into ONE direction-agnostic primitive, now
 * covering BOTH descendants ("down") and ancestors ("up", rewrite plan §7
 * Stage 3) — placement.ts itself now contains only placeGraph, a thin
 * orchestrator that calls growBranch in both directions plus the in-law
 * ancestor sweep (growInLawAncestors, also here). See growBranch's own doc
 * comment below for the up/down shape, and growPersonBranchUp's for how the
 * ancestor side's centering/collision/remarriage handling is done by the
 * SAME machinery the descendant side already used, not a parallel
 * reimplementation of the same ideas (which is what placement.ts's old
 * ~1700-line row-based model had become).
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
 * growBranch — places one branch starting from `anchor`, in either direction:
 *
 *  - "down" (descendants): a person, together with every partnership/
 *    solo-parenthood they participate in, recursing into every child.
 *    Behaviorally identical to the pre-rewrite trio it replaced:
 *    placePersonBranch (this person + every partnership, side by side) →
 *    placeChildrenRow (each partnership's children, centered under the
 *    partnership) → growSpouseOwnPartnerships (a spouse's OTHER
 *    partnerships, grown outward from their own fixed position — the
 *    concrete remarriage mechanism).
 *
 *  - "up" (ancestors): rootId must ALREADY be placed (by the caller) —
 *    growBranch("up") grows their recorded parents upward from that fixed
 *    position, one generation at a time, recursing into each parent's own
 *    parents. Mirrors the SAME shape as "down", just walking parentIds
 *    instead of a partnership's childrenIds: a parent pair is measured and
 *    placed as one unit (own-anchor), their OTHER not-yet-placed children
 *    (rootId's full siblings — the "uncles/aunts" of whoever pulled this
 *    ancestor pair into the graph) are grown as a row on rootId's OWN
 *    generation using the "down" child-row machinery (row-center), and each
 *    parent's OTHER partnerships (ancestor-side remarriage) are grown
 *    outward from their own fixed position (spouse-relative) — replacing
 *    placement.ts's placeAncestors/placeAncestorUnit/placeUnplacedSiblings
 *    trio (rewrite plan §7 Stage 3).
 *
 * Kept as several cooperating inner functions per direction for the same
 * reason placement.ts split them: each has a distinctly different anchoring
 * rule, not because they're conceptually separate passes.
 */
export function growBranch(
  ctx: GrowthContext,
  rootId: string,
  direction: GrowDirection,
  anchor: Point,
): void {
  if (direction === "up") {
    growPersonBranchUp(ctx, rootId);
    return;
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

// ---------------------------------------------------------------------------
// growBranch("up") — ancestor growth. Rewrite plan §7 Stage 3.
// ---------------------------------------------------------------------------

/**
 * The horizontal search bias for placing a person's own ancestor line,
 * derived from `branch` (assigned once by graph.ts's simultaneous BFS flood-
 * fill): paternal lines only ever search leftward, maternal only rightward —
 * "the father's whole line stays strictly left, the mother's strictly right"
 * is CLAUDE.md's own oldest tree-layout invariant, and here it is a single
 * value read once by findFreeInterval's bias parameter, not a convention
 * that many different functions each have to independently rediscover
 * (which is exactly how placement.ts's `sideRank`/`branchDirection`, defined
 * separately in three different functions, drifted apart over its patch
 * history). focus/descendant/unknown people have no ancestor side of their
 * own to protect (a descendant's own in-law ancestors just need SOME
 * consistent side, not specifically left or right) — bias 0 there searches
 * both directions, same as placeAncestorUnit's old default.
 */
function ancestorSideBias(branch: string): -1 | 0 | 1 {
  if (branch === "paternal") return -1;
  if (branch === "maternal") return 1;
  return 0;
}

/**
 * The direction bias for growing `personId`'s OWN sibling row (their
 * "uncles/aunts", from the perspective of whoever pulled them into the
 * graph) — stronger and more local than ancestorSideBias's whole-lineage
 * paternal/maternal split: when personId ALREADY has a spouse placed (an
 * ordinary married ancestor couple, e.g. Nikolai Kozlovsky + Nadezhda), that
 * spouse's own sibling row is being grown independently, on the SAME
 * generation row, and the two rows must grow in OPPOSITE directions from
 * each other — husband's siblings strictly away from the wife's side, wife's
 * siblings strictly away from the husband's side — never toward each other,
 * or the loser (whichever row is grown SECOND) would randomly slot in
 * between the couple and the other row's siblings. This can't be left to
 * growSiblingRow's own "probe whichever side is free" fallback: whichever
 * row happens to grow FIRST (before the spouse's own siblings exist yet)
 * would see an empty probe on BOTH sides and default toward the spouse,
 * landing exactly between the couple and the spouse's own not-yet-placed
 * siblings — a real bug caught this way (Nikolai Kozlovsky's brothers Yuzik/
 * Daniil/Alexey ended up sandwiched between Nadezhda and HER OWN brothers,
 * since Nikolai's row happened to be `primaryParentId` and grew first from
 * an all-empty row). Falls back to ancestorSideBias(pullingBranch) only when
 * personId has no placed spouse to take a side against (a solo ancestor, or
 * the very first person placed on an otherwise-empty row).
 */
function siblingRowSideBias(
  ctx: GrowthContext,
  personId: string,
  pullingBranch: string,
): -1 | 0 | 1 {
  const spouseId = spouseOf(ctx.graph, personId);
  const spousePos = spouseId ? ctx.positionByPerson.get(spouseId) : undefined;
  const ownPos = ctx.positionByPerson.get(personId);
  if (spousePos && ownPos) {
    return ownPos.x <= spousePos.x ? -1 : 1;
  }
  return ancestorSideBias(pullingBranch);
}

/**
 * The direction bias for placing `personId`'s OWN ancestor pair (their
 * parents) — analogous to siblingRowSideBias, but for the OTHER shape of
 * same-row conflict: two DIFFERENT people who are themselves married to
 * each other (e.g. Nikolai + Elizaveta Kupchik) can each independently pull
 * their OWN ancestor pair onto the exact same generation row (Vladimir/Marfa
 * above Nikolai; Grigory/Elizaveta Krivusha above Elizaveta), and BOTH
 * pulling people can share the identical `branch` label (both "paternal",
 * say) since branch tracks lineage-relative-to-focus, not which spouse of a
 * married pair someone is. Falling back to ancestorSideBias(pullingBranch)
 * alone for both would apply the SAME bias direction to both ancestor
 * pairs — whichever is placed first (growPersonBranchUp's Step 3 always
 * processes primaryParentId, i.e. the FIRST spouse's own ancestry, before
 * secondaryParentId's) keeps its ideal center, and the second one, forced
 * to search in that same fixed direction even though its own ideal
 * (Elizaveta's x) already sits on the OPPOSITE side of the first pair's
 * span, searches PAST the first pair instead of stopping short of it —
 * crossing their own connector lines even though neither pair individually
 * collides with anything. Real bug caught exactly this way: Grigory/
 * Elizaveta Krivusha (pulled toward Elizaveta, right of Nikolai) ended up
 * LEFT of Vladimir/Marfa (pulled toward Nikolai) instead of right of them.
 * When `personId` has a placed spouse whose OWN ancestor pair is ALREADY
 * placed, bias instead toward whichever side personId's own x sits relative
 * to that spouse's x — mirrors siblingRowSideBias's "which side of my
 * spouse am I on" logic, just for ancestor-pair placement instead of
 * sibling-row placement. Falls back to the ordinary lineage bias when there
 * is no such already-placed counterpart to react to (the common case — most
 * ancestor pairs are the ONLY one pulled onto their row).
 */
function ownAncestorSideBias(
  ctx: GrowthContext,
  personId: string,
  pullingBranch: string,
): -1 | 0 | 1 {
  const spouseId = spouseOf(ctx.graph, personId);
  const ownPos = ctx.positionByPerson.get(personId);
  if (spouseId && ownPos) {
    const spouse = ctx.graph.personById.get(spouseId);
    const spousePos = ctx.positionByPerson.get(spouseId);
    const spouseParentPlaced =
      spouse &&
      spouse.parentIds.length > 0 &&
      ctx.positionByPerson.has(spouse.parentIds[0]);
    if (spousePos && spouseParentPlaced) {
      return ownPos.x <= spousePos.x ? -1 : 1;
    }
  }
  return ancestorSideBias(pullingBranch);
}

/** The full width (both cards + gap) an ancestor unit will occupy, whether paired or solo. */
function ancestorUnitWidth(graph: NormalizedGraph, personId: string): number {
  return spouseOf(graph, personId) ? CARD_WIDTH * 2 + SPOUSE_GAP : CARD_WIDTH;
}

function spouseOf(
  graph: NormalizedGraph,
  personId: string,
): string | undefined {
  const person = graph.personById.get(personId);
  if (!person) return undefined;
  const partnershipId = person.partnershipIds.find((id) => {
    const p = graph.partnershipById.get(id);
    return p && (p.leftPersonId === personId || p.rightPersonId === personId);
  });
  const partnership = partnershipId
    ? graph.partnershipById.get(partnershipId)
    : undefined;
  if (!partnership) return undefined;
  return partnership.leftPersonId === personId
    ? partnership.rightPersonId
    : partnership.leftPersonId;
}

/**
 * Every OTHER child of `personId`'s own parent(s) — via EVERY recorded
 * partnership of either parent, plus either parent's own solo-parent
 * children — excluding personId itself. Deliberately broader than "same
 * exact parentIds set": a parent's solo-parent child (e.g. father has a
 * partnership with mother producing `focus`, AND a separate, unpartnered
 * solo-parent link producing `solo-child`) is still `focus`'s sibling for
 * placement purposes (they share a blood parent, `father`, and must be
 * placed as one sibling row under him) even though their recorded
 * `parentIds` arrays differ (["father","mother"] vs ["father"]). Mirrors
 * placement.ts's old placeAncestors `childrenIdsByPersonId` construction,
 * which combined BOTH sources per parent for exactly this reason (a `??`
 * fallback there would have silently dropped one source the moment a
 * parent had children from more than one origin).
 */
function parentRowSiblingsOf(graph: NormalizedGraph, personId: string): string[] {
  const person = graph.personById.get(personId);
  if (!person || person.parentIds.length === 0) return [];

  const siblingIds = new Set<string>();
  for (const parentId of person.parentIds) {
    const parent = graph.personById.get(parentId);
    if (!parent) continue;
    for (const partnershipId of parent.partnershipIds) {
      const partnership = graph.partnershipById.get(partnershipId);
      if (partnership) {
        for (const childId of partnership.childrenIds) siblingIds.add(childId);
      }
    }
    const solo = graph.soloParentByPersonId.get(parentId);
    if (solo) for (const childId of solo.childrenIds) siblingIds.add(childId);
  }
  siblingIds.delete(personId);
  return [...siblingIds];
}

/**
 * Grows `personId`'s recorded parents upward from `personId`'s ALREADY FIXED
 * position (set by the caller — growBranch("down"), a sibling row, or an
 * earlier growPersonBranchUp call one generation down). No-op if `personId`
 * has no recorded parents, or if their parents are already placed (e.g. a
 * full sibling processed earlier already grew this same parent pair).
 *
 * Mirrors growPersonBranchDown's own three-part shape, just walking upward:
 *   1. Complete personId's OWN sibling row first (their full siblings — the
 *      "uncles/aunts" from the pulling-in descendant's perspective — grown
 *      via the ordinary DOWN child-row machinery, since a sibling and their
 *      own spouse/descendants are exactly an ordinary down-branch, just one
 *      that happens to be discovered from above rather than from a parent's
 *      own childrenIds walk), so the parent pair's centering math below sees
 *      the FULL row, not just whichever child triggered this call — same
 *      requirement CLAUDE.md documents for the old engine's "parents centered
 *      over the full child row" rule.
 *   2. Place the parent pair (or solo parent) directly above the row's true
 *      center, resolving any actual collision by searching outward ONLY in
 *      this branch's own ancestorSideBias direction — never crossing to the
 *      other lineage's side even when that side is free first.
 *   3. Recurse: grow each parent's own parents further up (the ancestor
 *      chain), and grow each parent's OTHER partnerships sideways (ancestor-
 *      side remarriage — a grandparent's second marriage).
 */
function growPersonBranchUp(ctx: GrowthContext, personId: string): void {
  const { graph, positionByPerson } = ctx;
  const person = graph.personById.get(personId);
  if (!person || person.parentIds.length === 0) return;

  const primaryParentId = person.parentIds[0];
  if (positionByPerson.has(primaryParentId)) return; // already grown via a sibling processed earlier

  const ownPos = positionByPerson.get(personId);
  if (!ownPos) return; // personId itself isn't placed yet — caller error, nothing to anchor from

  // Step 1: complete the sibling row (see doc comment above) BEFORE reading
  // any position to compute the parent pair's ideal center.
  const siblingIds = parentRowSiblingsOf(graph, personId);
  const unplacedSiblingIds = siblingIds.filter(
    (id) => !positionByPerson.has(id),
  );
  if (unplacedSiblingIds.length > 0) {
    growSiblingRow(
      ctx,
      personId,
      ownPos.x,
      ownPos.y,
      unplacedSiblingIds,
      siblingRowSideBias(ctx, personId, person.branch),
    );
  }

  // Step 2: the parent pair's ideal center is the average x of EVERY placed
  // child in this sibling group (personId plus every now-placed sibling) —
  // never just personId alone, so a parent pair with several already-placed
  // children centers over the true row midpoint, not over whichever child
  // happened to pull them into the graph first.
  const rowXs = [personId, ...siblingIds]
    .map((id) => positionByPerson.get(id)?.x)
    .filter((x): x is number => typeof x === "number");
  const idealX =
    rowXs.length > 0
      ? rowXs.reduce((a, b) => a + b, 0) / rowXs.length
      : ownPos.x;
  const parentY = ownPos.y - GENERATION_GAP;

  placeAncestorUnit(
    ctx,
    primaryParentId,
    idealX,
    parentY,
    ownAncestorSideBias(ctx, personId, person.branch),
  );

  // Step 3: recurse upward from each parent, and grow each parent's OTHER
  // partnerships sideways (ancestor-side remarriage).
  const placedPrimary = positionByPerson.has(primaryParentId);
  if (placedPrimary) {
    growSpouseOwnPartnershipsUp(ctx, primaryParentId, person.branch);
    growPersonBranchUp(ctx, primaryParentId);
  }
  const secondaryParentId = person.parentIds[1];
  if (secondaryParentId && positionByPerson.has(secondaryParentId)) {
    growSpouseOwnPartnershipsUp(ctx, secondaryParentId, person.branch);
    growPersonBranchUp(ctx, secondaryParentId);
  }
}

/**
 * Rejects a candidate slot that would put a paternal-branch card at or past
 * a maternal-branch card's x on the SAME exact row (or vice versa) —
 * "paternal strictly left / maternal strictly right" (CLAUDE.md's oldest
 * tree-layout invariant), checked directly against every already-placed
 * person sharing `candidateY`, not just what plain occupancy-freedom
 * happens to catch (see findFreeSlot's own doc comment on why occupancy
 * alone can't see this — two non-overlapping reservations can still be in
 * the wrong relative order). `unitWidth`/`isLeft` aren't needed here: this
 * only cares about ORDER, so comparing the unit's own about-to-be-placed
 * personId x (the candidate itself — close enough for the order check,
 * since the unit's own spouse sits within one CARD_WIDTH+SPOUSE_GAP of it,
 * never past an opposite-branch neighbor without candidateX itself already
 * being past it too) against every opposite-branch same-row x is sufficient.
 * Branches other than paternal/maternal (focus, descendant, unknown) have no
 * ordering constraint at all — only a paternal/maternal PAIR sharing a row
 * is checked, same restriction findSideConstraintViolation documents.
 */
function sideConstraintOk(
  ctx: GrowthContext,
  branch: string,
  candidateX: number,
  candidateY: number,
): boolean {
  if (branch !== "paternal" && branch !== "maternal") return true;
  const { graph, positionByPerson } = ctx;
  const opposite = branch === "paternal" ? "maternal" : "paternal";
  for (const [otherId, pos] of positionByPerson) {
    if (pos.y !== candidateY) continue;
    const other = graph.personById.get(otherId);
    if (!other || other.branch !== opposite) continue;
    if (branch === "paternal" && candidateX >= pos.x) return false;
    if (branch === "maternal" && candidateX <= pos.x) return false;
  }
  return true;
}

/**
 * Places one ancestor "unit" (a person, together with their spouse if any,
 * per Partnership.leftPersonId/rightPersonId — never split apart) at the
 * best available x on their generation row: preferred candidate is `idealX`
 * (the pulling child row's own center, already computed by the caller),
 * falling back to sliding outward — strictly toward `bias`'s direction,
 * never the other side — until a collision-free interval is found. `bias`
 * is caller-computed (ancestorSideBias for the ordinary case, or
 * ownAncestorSideBias when two married co-parents can each pull an ancestor
 * pair onto the same row — see that function's own doc comment for why a
 * flat per-branch bias isn't always enough there). Mirrors placement.ts's
 * old placeAncestorUnit, minus the separate resolveSymmetricOverlaps
 * pre-pass: two neighboring ancestor units competing for the same ideal
 * center is now an ordinary occupancy collision, resolved the same way any
 * other branch-vs-branch collision is (search outward from the
 * later-processed unit's own ideal) — see rewrite plan §2.3's "local
 * obstacle avoidance replaces the old up-front symmetric split" design note.
 *
 * Elastic Y (rewrite plan §7 Stage 4): if the whole X search radius at the
 * natural row `y` is exhausted, `findFreeSlot` retries the same X search on
 * `y` nudged up/down in bounded steps (see its own doc comment) before
 * falling back to a forced placement — this is what resolves the class of
 * bug the Stage 3 doc comment used to flag as a KNOWN GAP here: two
 * mutually-unrelated same-branch clusters (branch is a whole-lineage flood
 * fill, not "directly related to any specific other same-branch cluster")
 * landing on the identical row via unrelated BFS paths, with no row-level
 * coordination between them — an X-only search can never resolve that (it
 * only avoids an obstacle it actively searches past, not one an unrelated
 * chain's own idealX already starts beyond), but a small Y offset gives the
 * later-placed cluster a genuinely free row to land on instead. `findFreeSlot`
 * ALSO takes sideConstraintOk (above) as its validate callback, rejecting an
 * otherwise-free candidate that would still land in the wrong relative
 * order — belt-and-suspenders with the post-placement repair pass
 * (repairSideConstraintViolations, further down this file) that catches
 * whatever this during-placement check can't (growSiblingRow/
 * growPersonBranchDown's cursor-arithmetic placement has no single search
 * call to attach a validator to — see that function's own doc comment). The
 * person's OWN `y` becomes whatever the search actually resolved
 * (`resolved.y`, not necessarily the `y` parameter) — safe because every
 * caller re-derives its own children's/parents' target y from THIS person's
 * actual placed position afterward (growPersonBranchUp computes `parentY =
 * ownPos.y - GENERATION_GAP` fresh from the placed child, never from a
 * value cached before this call), so a nudge here propagates consistently
 * up the chain instead of leaving the row's own children still anchored to
 * the pre-nudge y.
 */
function placeAncestorUnit(
  ctx: GrowthContext,
  personId: string,
  idealX: number,
  y: number,
  bias: -1 | 0 | 1,
): void {
  const { graph, occupancy, positionByPerson, junctionByPartnership } = ctx;
  if (positionByPerson.has(personId)) return;
  const person = graph.personById.get(personId);
  if (!person) return;

  const spouseId = spouseOf(graph, personId);
  const partnershipId = spouseId
    ? person.partnershipIds.find((id) => {
        const p = graph.partnershipById.get(id);
        return (
          p && (p.leftPersonId === personId || p.rightPersonId === personId)
        );
      })
    : undefined;
  const partnership = partnershipId
    ? graph.partnershipById.get(partnershipId)
    : undefined;

  // Spouses ALWAYS stay at the standard SPOUSE_GAP — never stretched apart to
  // make room for their own (not-yet-placed) parents (CLAUDE.md: "husband and
  // wife are a compact visual unit" outranks "the connector line to
  // grandparents is perfectly straight").
  const unitWidth = ancestorUnitWidth(graph, personId);
  const gap = Math.max(SIBLING_GAP, INTER_FAMILY_GAP);

  const resolvedSlot = occupancy.findFreeSlot(
    y,
    CARD_HEIGHT,
    unitWidth,
    gap,
    idealX,
    4000,
    bias,
    Y_NUDGE_STEP,
    MAX_Y_NUDGE,
    (candidate) =>
      sideConstraintOk(ctx, person.branch, candidate.x, candidate.y),
  ) ?? { x: idealX + bias * gap, y };
  const resolvedX = resolvedSlot.x;
  const resolvedY = resolvedSlot.y;

  if (spouseId && partnership) {
    const isLeft = partnership.leftPersonId === personId;
    const selfX = isLeft
      ? resolvedX - CARD_WIDTH / 2 - SPOUSE_GAP / 2
      : resolvedX + CARD_WIDTH / 2 + SPOUSE_GAP / 2;
    const spouseX = isLeft
      ? resolvedX + CARD_WIDTH / 2 + SPOUSE_GAP / 2
      : resolvedX - CARD_WIDTH / 2 - SPOUSE_GAP / 2;
    positionByPerson.set(personId, { x: selfX, y: resolvedY });
    positionByPerson.set(spouseId, { x: spouseX, y: resolvedY });
    occupancy.reserve({
      x: selfX,
      y: resolvedY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
    occupancy.reserve({
      x: spouseX,
      y: resolvedY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
    junctionByPartnership.set(partnership.id, {
      x: (selfX + spouseX) / 2,
      y: resolvedY + CARD_HEIGHT / 2 + GENERATION_GAP / 2,
    });
  } else {
    positionByPerson.set(personId, { x: resolvedX, y: resolvedY });
    occupancy.reserve({
      x: resolvedX,
      y: resolvedY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  }
}

/**
 * Predicts the exact set of card x-positions growPersonBranchDown(personId,
 * anchorX, y) would assign AT THIS ROW (personId's own card, plus every
 * spouse from every partnership — never descendants, which land one full
 * GENERATION_GAP further down and can never collide with anything at THIS
 * y no matter how wide their own subtree is) — without actually placing
 * anything. Mirrors growPersonBranchDown's own cursor math EXACTLY
 * (including using each partnership's real measurePartnershipWidth
 * totalWidth for cursor SPACING between branches, since a partnership with
 * many descendants genuinely does get spaced further from its neighboring
 * branch by growPersonBranchDown, even though the descendants themselves
 * land elsewhere) — critical because an approximation using only
 * CARD_WIDTH*2+SPOUSE_GAP per branch (ignoring descendant-driven spacing
 * between REMARRIAGE branches) UNDER-predicts how far apart a remarried
 * person's second partnership's spouse actually ends up when a partnership
 * has children, causing exactly the false-negative collision check this
 * function replaces: a "the row must be free, nothing else could collide"
 * verification that quietly used the WRONG width whenever any partnership
 * had its own children, understating the true cursor advance and letting a
 * genuinely-colliding position through undetected.
 */
function predictRowCardPositions(
  graph: NormalizedGraph,
  personId: string,
  anchorX: number,
  memo: Map<string, SubtreeMeasurement>,
): number[] {
  const person = graph.personById.get(personId);
  if (!person) return [anchorX];

  const partnerships = person.partnershipIds
    .map((id) => graph.partnershipById.get(id))
    .filter((p): p is Partnership => Boolean(p));
  const solo = graph.soloParentByPersonId.get(personId);
  if (partnerships.length === 0 && !solo) return [anchorX];

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
  const positions: number[] = [];
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
    const spouseX = isLeft
      ? branchCenter + CARD_WIDTH / 2 + SPOUSE_GAP / 2
      : branchCenter - CARD_WIDTH / 2 - SPOUSE_GAP / 2;

    if (!personPlaced) {
      positions.push(selfX);
      personPlaced = true;
    }
    positions.push(spouseX);
  }

  if (solo) {
    const width = branchWidths[branchWidths.length - 1];
    const branchCenter = cursor + width / 2;
    if (!personPlaced) positions.push(branchCenter);
  }

  return positions;
}

/**
 * The signed X offset of `personId`'s OWN card relative to whatever
 * `anchorX` would be passed into growPersonBranchDown(personId, anchorX,
 * ...) — i.e. `ownCardX - anchorX`. growPersonBranchDown centers a person's
 * FULL subtree (their own card plus their spouse's card plus every
 * descendant) around `anchorX`, so for anyone with a partnership/solo-parent
 * branch, their OWN card sits offset from that center, not AT it — this
 * mirrors that exact same math (branchCenter for the person's FIRST
 * partnership/solo branch, i=0 in growPersonBranchDown's own loop, since
 * that's always the branch that places the person's own card) so callers
 * that need to land a specific person's card at an EXACT target x (not just
 * "somewhere in the middle of their subtree") can invert it: pass
 * `targetOwnX - ownCardOffsetFromAnchor(...)` as anchorX.
 */
function ownCardOffsetFromAnchor(
  graph: NormalizedGraph,
  personId: string,
  memo: Map<string, SubtreeMeasurement>,
): number {
  const person = graph.personById.get(personId);
  if (!person) return 0;

  const partnerships = person.partnershipIds
    .map((id) => graph.partnershipById.get(id))
    .filter((p): p is Partnership => Boolean(p));
  const solo = graph.soloParentByPersonId.get(personId);
  if (partnerships.length === 0 && !solo) return 0; // childless/unpartnered — own card IS the anchor

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
  // The person's own card is always placed on branch i=0 (their FIRST
  // partnership, or their solo branch if that's their only branch) — see
  // growPersonBranchDown's own `personPlaced` flag, set true on the first
  // iteration and never reconsidered after.
  const firstWidth = branchWidths[0];
  const branchCenterOffset = -totalWidth / 2 + firstWidth / 2;

  if (partnerships.length === 0) return branchCenterOffset; // solo-only — own card IS this branch's center

  const isLeft = partnerships[0].leftPersonId === personId;
  const selfOffset = isLeft
    ? -CARD_WIDTH / 2 - SPOUSE_GAP / 2
    : CARD_WIDTH / 2 + SPOUSE_GAP / 2;
  return branchCenterOffset + selfOffset;
}

/**
 * Places a row of not-yet-placed full siblings of `personId` (the "uncles/
 * aunts" pulled in by growing personId's ancestry upward), one at a time,
 * growing outward from personId's OWN already-fixed card — mirrors
 * placement.ts's old placeUnplacedSiblings exactly: each new sibling's OWN
 * card lands at precisely SIBLING_GAP from the previous sibling's own card
 * (never widened by that sibling's own spouse/descendant subtree width,
 * which grows entirely on the FAR side, away from the blood-sibling chain —
 * CLAUDE.md's own documented "blood-sibling gap must not inflate just
 * because a neighbor has a spouse" rule). Each sibling's own down-branch
 * (spouse + descendants) is then grown via the ordinary growPersonBranchDown
 * machinery, anchored (via ownCardOffsetFromAnchor's inversion) so their own
 * card lands EXACTLY at the tight position already chosen, not merely
 * "somewhere in their subtree's centered span".
 */
function growSiblingRow(
  ctx: GrowthContext,
  personId: string,
  personX: number,
  y: number,
  unplacedSiblingIds: string[],
  sideBias: -1 | 0 | 1,
): void {
  const { graph, occupancy, memo } = ctx;

  // The row grows outward from personX in ONE consistent direction for
  // every sibling. When this row belongs to a specific ancestor lineage
  // (sideBias ±1 — paternal uncles/aunts must grow further LEFT, never
  // right, even if the right side happens to be free first; symmetric for
  // maternal), that bias is a HARD requirement, not just a preference —
  // growing a paternal sibling row rightward would pull the eventual parent
  // pair's own idealX (averaged over this now-placed row, see
  // growPersonBranchUp's step 2) toward the maternal side, which is exactly
  // the "father's line stays strictly left" invariant CLAUDE.md documents.
  // Only when sideBias is 0 (a focus-level or descendant-side sibling row,
  // with no lineage side to protect) does direction fall back to "try the
  // free side first, right then left" — same "pick a direction once, don't
  // flip mid-row" rule placement.ts's placeUnplacedSiblings documents. This
  // is only a DIRECTION probe (a rough over-estimate using each sibling's
  // full subtree width is fine here — actual placement below only ever
  // reserves each sibling's own tight SIBLING_GAP slot, never this probe
  // width).
  const probeWidths = unplacedSiblingIds.map(
    (id) => measurePersonWidth(graph, id, memo).totalWidth,
  );
  const probeTotalWidth =
    probeWidths.reduce((a, b) => a + b, 0) +
    SIBLING_GAP * Math.max(0, probeWidths.length - 1);
  let growRight: boolean;
  if (sideBias !== 0) {
    growRight = sideBias === 1;
  } else {
    const rightCenterX =
      personX + CARD_WIDTH / 2 + SIBLING_GAP + probeTotalWidth / 2;
    const rightFree = !occupancy.intersects(
      { x: rightCenterX, y, width: probeTotalWidth, height: CARD_HEIGHT },
      SIBLING_GAP,
    );
    if (rightFree) {
      growRight = true;
    } else {
      const leftFree = !occupancy.intersects(
        {
          x: personX - CARD_WIDTH / 2 - SIBLING_GAP - probeTotalWidth / 2,
          y,
          width: probeTotalWidth,
          height: CARD_HEIGHT,
        },
        SIBLING_GAP,
      );
      // Neither side's up-front probe was free: default to right — the
      // per-sibling tight-slot search inside the loop below still finds the
      // true nearest free position on whichever side actually works (this
      // probe is only a cheap up-front direction choice, not the final
      // placement), same as before this bias-aware branch was added.
      growRight = !leftFree;
    }
  }

  let anchorX = personX;
  for (const siblingId of unplacedSiblingIds) {
    // A sibling who ALREADY has a spouse of their own needs their spouse's
    // required side checked: growPersonBranchDown places a partnership's
    // left/right members by gender (shouldBeLeft, an ABSOLUTE rule — husband
    // left of wife — with no awareness of which way THIS row happens to be
    // growing). When that required side points TOWARD the anchor (the
    // already-placed previous sibling), the spouse's card unavoidably lands
    // between the two blood siblings, and the tight slot must widen to fit
    // the spouse's own card + SPOUSE_GAP too, or growPersonBranchDown would
    // place the spouse right on top of the previous sibling's own card.
    // When the spouse's required side points AWAY from the anchor (the
    // common case), it needs no extra room here at all — it grows entirely
    // on the far side, outside this tight slot, exactly like an ordinary
    // down-branch. Mirrors placement.ts's old placeUnplacedSiblings
    // spouseTowardAnchor handling.
    const spouseId = spouseOf(graph, siblingId);
    const spouseNotYetPlaced =
      Boolean(spouseId) && !ctx.positionByPerson.has(spouseId!);
    const partnership = spouseNotYetPlaced
      ? graph.personById.get(siblingId)!.partnershipIds
          .map((id) => graph.partnershipById.get(id))
          .find(
            (p): p is Partnership =>
              Boolean(p) &&
              (p!.leftPersonId === siblingId || p!.rightPersonId === siblingId),
          )
      : undefined;
    // True when the spouse belongs on siblingId's side FACING the anchor —
    // growRight means the anchor is to the LEFT of this new sibling, so a
    // spouse required on siblingId's LEFT (siblingId is rightPersonId)
    // points toward the anchor; symmetric for growing left.
    const spouseGoesLeft = partnership?.rightPersonId === siblingId;
    const spouseTowardAnchor = spouseNotYetPlaced
      ? growRight
        ? spouseGoesLeft
        : !spouseGoesLeft
      : false;
    const extraWidth = spouseTowardAnchor ? CARD_WIDTH + SPOUSE_GAP : 0;

    // Tight target: exactly SIBLING_GAP from the previous card's edge, on
    // the chosen side. The near-side width is normally just CARD_WIDTH
    // (this sibling's own card) — their spouse/descendant subtree grows
    // afterward on the FAR side by growPersonBranchDown itself — EXCEPT in
    // the spouseTowardAnchor case above, where the spouse unavoidably sits
    // between the two blood siblings and must be included in the near-side
    // reservation.
    const nearSideWidth = CARD_WIDTH + extraWidth;
    const targetNearEdgeX = growRight
      ? anchorX + CARD_WIDTH / 2 + SIBLING_GAP
      : anchorX - CARD_WIDTH / 2 - SIBLING_GAP;
    const targetNearSideCenterX = growRight
      ? targetNearEdgeX + nearSideWidth / 2
      : targetNearEdgeX - nearSideWidth / 2;
    // (The sibling's OWN eventual card x — computed below as resolvedOwnX,
    // after the occupancy check — sits on the FAR side of this reserved
    // block from the anchor whenever their spouse occupies the near side:
    // the spouse is the one immediately next to the previous sibling in
    // that case, not this sibling. The opposite sign from what might look
    // intuitive at first glance.)

    // A genuinely occupied tight slot (an unrelated in-law from a
    // neighboring branch, not a blood sibling — blood siblings are always
    // placed one at a time in this exact loop, so nothing else could
    // already sit exactly there) falls back to an ordinary occupancy search
    // outward, using INTER_FAMILY_GAP once a fallback is needed — mirrors
    // placement.ts's own reasoning for why the boundary against an
    // unrelated in-law must use the wider gap once the tight slot fails,
    // never the tight SIBLING_GAP itself. The check here uses gap=0, NOT
    // SIBLING_GAP: targetNearEdgeX above was already computed exactly
    // SIBLING_GAP away from the anchor's own card edge — adding SIBLING_GAP
    // again here as an intersects() buffer double-counts that same gap and
    // (at typical fixture coordinates) can tip a merely-ADJACENT reservation
    // (e.g. this exact slot's own near edge sitting exactly at the
    // anchor-side neighbor's far edge) into a false "occupied" reading from
    // floating-point rounding at the shared boundary — genuinely wrong, not
    // just cosmetic: it sent this sibling through the wider INTER_FAMILY_GAP
    // fallback search for a slot that was already perfectly free.
    const tightFree = !occupancy.intersects(
      {
        x: targetNearSideCenterX,
        y,
        width: nearSideWidth,
        height: CARD_HEIGHT,
      },
      0,
    );
    const resolvedNearSideCenterX = tightFree
      ? targetNearSideCenterX
      : (occupancy.findFreeInterval(
          y,
          CARD_HEIGHT,
          nearSideWidth,
          INTER_FAMILY_GAP,
          targetNearSideCenterX,
          3000,
          growRight ? 1 : -1,
        ) ?? targetNearSideCenterX);
    const resolvedOwnX = growRight
      ? resolvedNearSideCenterX + extraWidth / 2
      : resolvedNearSideCenterX - extraWidth / 2;

    const offset = ownCardOffsetFromAnchor(graph, siblingId, memo);
    const subtreeAnchorX = resolvedOwnX - offset;

    // The near-side-only check above (tightFree/findFreeInterval) only ever
    // verified THIS sibling's own tight card slot (plus, when applicable,
    // their FIRST partnership's spouse) — it never checked the sibling's
    // full ROW-LEVEL footprint (every partnership's own card, NOT their
    // descendants — descendants land one row further down, at
    // y+GENERATION_GAP, so they can never collide with anything AT this row
    // y no matter how wide their own subtree is). A sibling with MULTIPLE
    // partnerships (remarriage) has a second (or third...) branch that
    // growPersonBranchDown lays out via its own fixed left-to-right cursor
    // sequence, which can extend the sibling's actual ROW footprint well
    // beyond what the near-side check considered — even toward the ANCHOR
    // side, independent of extraWidth's own toward-anchor logic (which only
    // reasons about the FIRST partnership). Real bugs caught by property
    // testing (rewrite plan §8a), TWO separate ones: (1) a remarried
    // sibling's second partnership's spouse landed almost exactly on top of
    // an unrelated already-placed person, because nothing had reserved or
    // even checked that spouse's actual landing spot before
    // growPersonBranchDown committed it; (2) a first attempt at fixing (1)
    // approximated the check with a single aggregate rectangle sized from
    // each partnership's flat ownWidth (CARD_WIDTH*2+SPOUSE_GAP) — but
    // growPersonBranchDown's REAL cursor spacing between REMARRIAGE
    // branches uses each partnership's full measurePartnershipWidth
    // totalWidth (which grows when that branch has its own children, even
    // though the children themselves land one row down) — so the flat
    // approximation under-predicted the true cursor advance whenever any
    // partnership had children, silently passing a check against a WIDTH
    // narrower than where the spouse actually ends up. predictRowCardPositions
    // replicates growPersonBranchDown's cursor math exactly (same
    // totalWidth-based spacing) and returns each card's REAL predicted x,
    // checked individually against occupancy — no aggregate-rectangle
    // approximation to drift out of sync with the real placement math again.
    const predictedCardXs = predictRowCardPositions(
      graph,
      siblingId,
      subtreeAnchorX,
      memo,
    );
    const allCardsFree = predictedCardXs.every(
      (cardX) =>
        !occupancy.intersects(
          { x: cardX, y, width: CARD_WIDTH, height: CARD_HEIGHT },
          0,
        ),
    );
    let finalResolvedOwnX = resolvedOwnX;
    let finalSubtreeAnchorX = subtreeAnchorX;
    if (!allCardsFree) {
      // Fallback: widen the search outward from the tight target, checking
      // EVERY predicted card position at each candidate anchor shift (not
      // just one aggregate rect) until a fully-clear anchor is found.
      // Bounded step count (not a true findFreeInterval search) — this is
      // the rare multi-partnership-collision case; a coarse but bounded
      // search is enough to escape the immediate obstacle without the cost
      // of re-deriving occupancy's own internal step/candidate logic here.
      const step = Math.max(8, Math.round(CARD_WIDTH / 4));
      const direction = growRight ? 1 : -1;
      for (let offsetStep = step; offsetStep <= 4000; offsetStep += step) {
        const candidateAnchorX = subtreeAnchorX + direction * offsetStep;
        const candidateCardXs = predictRowCardPositions(
          graph,
          siblingId,
          candidateAnchorX,
          memo,
        );
        const candidateFree = candidateCardXs.every(
          (cardX) =>
            !occupancy.intersects(
              { x: cardX, y, width: CARD_WIDTH, height: CARD_HEIGHT },
              INTER_FAMILY_GAP,
            ),
        );
        if (candidateFree) {
          finalSubtreeAnchorX = candidateAnchorX;
          finalResolvedOwnX = candidateAnchorX + offset;
          break;
        }
        // If the bounded search exhausts its radius without finding a
        // fully-clear anchor, fall through with the original (possibly
        // colliding) position — matches every other fallback in this file:
        // assertNoOverlaps at the end of buildTreeLayout is the final,
        // always-on backstop, and a pathological graph that can't be
        // resolved within the search radius should fail loudly there
        // rather than silently placing anyway.
      }
    }

    growPersonBranchDown(ctx, siblingId, finalSubtreeAnchorX, y);

    anchorX = finalResolvedOwnX;
  }
}

/**
 * Grows every partnership `personId` participates in OTHER than the one
 * whose junction is already set — ancestor-side remarriage (a grandparent's
 * second marriage). Mirrors growSpouseOwnPartnershipsDown exactly, just
 * called from the "up" direction with the pulling branch's own side bias
 * threaded through for the new spouse's own further ancestors, if any (grown
 * later by the in-law-ancestor sweep in placement.ts, same as the "down"
 * side's in-law spouses are).
 */
function growSpouseOwnPartnershipsUp(
  ctx: GrowthContext,
  personId: string,
  pullingBranch: string,
): void {
  const { graph, occupancy, positionByPerson, junctionByPartnership } = ctx;
  const person = graph.personById.get(personId);
  if (!person) return;
  const personPos = positionByPerson.get(personId);
  if (!personPos) return;

  for (const partnershipId of person.partnershipIds) {
    if (junctionByPartnership.has(partnershipId)) continue; // already grown (the "primary" partnership placeAncestorUnit just set, or a spouse's own earlier pass)
    const partnership = graph.partnershipById.get(partnershipId);
    if (!partnership) continue;

    const otherPersonId =
      partnership.leftPersonId === personId
        ? partnership.rightPersonId
        : partnership.leftPersonId;
    if (positionByPerson.has(otherPersonId)) continue;

    const isLeft = partnership.leftPersonId === personId;
    const preferredX = isLeft
      ? personPos.x + CARD_WIDTH / 2 + SPOUSE_GAP / 2 + CARD_WIDTH / 2
      : personPos.x - CARD_WIDTH / 2 - SPOUSE_GAP / 2 - CARD_WIDTH / 2;
    const direction = isLeft ? 1 : -1;
    const resolvedX =
      occupancy.findFreeInterval(
        personPos.y,
        CARD_HEIGHT,
        CARD_WIDTH,
        REMARRIAGE_GAP,
        preferredX,
        2000,
      ) ?? preferredX + direction * REMARRIAGE_GAP;

    positionByPerson.set(otherPersonId, { x: resolvedX, y: personPos.y });
    occupancy.reserve({
      x: resolvedX,
      y: personPos.y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });

    const junctionX = (personPos.x + resolvedX) / 2;
    junctionByPartnership.set(partnershipId, {
      x: junctionX,
      y: personPos.y + CARD_HEIGHT / 2 + GENERATION_GAP / 2,
    });

    growChildrenRowDown(
      ctx,
      partnership.childrenIds,
      junctionX,
      personPos.y + GENERATION_GAP,
    );
  }

  void pullingBranch; // reserved for a future ancestor-side-bias refinement on the new spouse's own line — not yet needed (in-law ancestor sweep uses its OWN branch, computed fresh from graph.ts)
}

/**
 * Grows the recorded parents of every currently-placed person whose own
 * parents don't have a position yet, iterated to a fixed point — the "in-law
 * ancestor" sweep. Needed because growPersonBranchUp only ever walks
 * `focusPersonId`'s OWN ancestor chain (called once, from placeGraph) — a
 * descendant's IN-LAW spouse (e.g. Viktor Kupchik's wife Galina, reached via
 * a downward path from the focus) has her own real parentIds recorded, but
 * nothing on the pure focus-upward walk ever visits her, since she was
 * placed by growBranch("down"), not by growPersonBranchUp's own sibling-row
 * discovery. Mirrors placement.ts's old placeInLawAncestors exactly (same
 * fixed-point iteration, same reasoning for why one pass isn't enough —
 * placing one generation of in-law parents can itself surface a grandparent
 * generation needing the same treatment).
 */
export function growInLawAncestors(ctx: GrowthContext): void {
  const { graph, positionByPerson } = ctx;
  const processed = new Set<string>();

  while (true) {
    const placedIds = [...positionByPerson.keys()];
    let placedAnyThisPass = false;

    for (const personId of placedIds) {
      if (processed.has(personId)) continue;
      processed.add(personId);

      const person = graph.personById.get(personId);
      if (!person || person.parentIds.length === 0) continue;
      if (positionByPerson.has(person.parentIds[0])) continue;

      const beforeSize = positionByPerson.size;
      growPersonBranchUp(ctx, personId);
      if (positionByPerson.size > beforeSize) placedAnyThisPass = true;
    }

    if (!placedAnyThisPass) break;
  }
}

/**
 * Post-placement repair pass (rewrite plan §7 Stage 4) for the ONE class of
 * side-constraint/interleaved-sibling violation that no during-placement
 * search can prevent: two mutually unrelated clusters that each compute
 * their own occupancy-free position with zero awareness of each other,
 * landing on the same row in the wrong relative order (see
 * sideConstraintOk's own doc comment — occupancy-freedom alone can't see
 * "which side", only "does it overlap"). `placeAncestorUnit`'s
 * sideConstraintOk validator already prevents this for units placed there,
 * but the SAME shape of bug also occurs in growSiblingRow/
 * growPersonBranchDown's cursor-arithmetic placement (uncle/aunt rows and
 * their own descendants, reached via the "down" side of a sibling-row
 * subtree) — those paths compute a card's x directly from cursor math, not
 * from an occupancy search, so there is no single search call to retrofit a
 * validator onto without duplicating cursor math in a second, parallel
 * implementation (exactly the "spec-case hooks scattered across many call
 * sites" failure mode the rewrite plan set out to avoid). Detecting the
 * violation AFTER placement and repairing it with a bounded, LOCAL,
 * whole-subtree Y-shift is the general fix: cheap to apply (this pass only
 * runs after growBranch/growInLawAncestors have already placed everyone),
 * safe by construction (a subtree shifted by a uniform deltaY keeps every
 * internal parent-child GENERATION_GAP relationship exactly intact — only
 * its position RELATIVE TO EVERYONE ELSE changes), and reversible (each
 * candidate shift is verified overlap-free against everyone NOT in the
 * moving subtree before being committed; a shift that would introduce a
 * NEW overlap is rejected and the next candidate tried instead).
 *
 * Bounded by MAX_Y_NUDGE — same "some pathological graphs won't fully
 * resolve, and that's OK" contract as findFreeSlot: assertNoOverlaps (this
 * pass changes no card's overlap status by construction, verified before
 * committing) remains the final hard backstop, and any violation this pass
 * can't resolve within budget is left as an accepted, documented known gap
 * — see invariants.property.test.ts's own rate-bound tracking.
 */
export function repairSideConstraintViolations(ctx: GrowthContext): void {
  const { graph } = ctx;

  // Iterate to a fixed point (bounded — a shift can change which pair is
  // now "most offending" on a row, but never re-introduces a PREVIOUSLY
  // resolved violation, since every accepted shift is itself verified
  // overlap- and violation-free at its own target row before committing).
  // Two independent violation KINDS share this same loop and the same
  // underlying shift mechanism (collectDescendantSubtreeIds +
  // tryShiftSubtreeOutOfViolation) — side-constraint (paternal/maternal
  // order) and interleaved-siblings (a foreign cluster wedged between two
  // blood siblings) are the same root cause wearing two different
  // invariant-checker faces (see this function's own doc comment above),
  // so fixing one can occasionally surface — or resolve — the other; side-
  // constraint is checked first each pass since it's the narrower, cheaper
  // check.
  const MAX_PASSES = 16;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const sideViolation = findFirstSideConstraintViolator(ctx);
    if (sideViolation) {
      const movingIds = collectDescendantSubtreeIds(graph, sideViolation.personId);
      if (tryShiftSubtreeOutOfViolation(ctx, movingIds)) continue;
      return; // couldn't resolve within budget — stop rather than loop on it forever
    }

    const siblingViolation = findFirstInterleavedSiblingViolator(ctx);
    if (siblingViolation) {
      const movingIds = collectDescendantSubtreeIds(
        graph,
        siblingViolation.foreignPersonId,
      );
      if (tryShiftSubtreeOutOfViolation(ctx, movingIds)) continue;
      return;
    }

    const farChildId = findFirstFarFromParentViolator(ctx);
    if (farChildId) {
      // Raising the parent's own ancestor branch is tried FIRST, not as a
      // last resort — the user's own explicit direction (2026-09-11): the
      // family unit (parent + child) must stay visually together under
      // their own junction, even when a technically-closer free slot
      // exists elsewhere for the child alone. tryMoveChildNearParent (a
      // search for pre-existing free space) is the fallback, only used
      // when raising the branch itself isn't possible (blocked by an
      // overlap it can't resolve, or the parent has no recorded ancestors
      // of their own to make room by moving).
      if (tryRaiseAncestorBranchForChild(ctx, farChildId)) continue;
      if (tryMoveChildNearParent(ctx, farChildId)) continue;
      return;
    }

    return; // no violation of any kind remains
  }
}

/**
 * How far a childless leaf's own x may drift from its parent partnership's
 * junction x before it reads as "not near the parent" (invariant #3 —
 * CLAUDE.md's own known-gap note, closed by this repair). A handful of card
 * widths — enough that an ordinary small sideways nudge from
 * growChildrenRowDown's own search never trips this, but far short of the
 * thousands-of-px drift growChildrenRowDown's unbounded search can produce
 * when the child's whole natural row is owned by an unrelated branch (the
 * actual bug: a real Neon family with a densely populated cousin row, see
 * the tree-layout-downward-strand-gap memory).
 */
const FAR_FROM_PARENT_X_THRESHOLD = CARD_WIDTH * 4;

/**
 * How far tryMoveChildNearParent's OWN search may look in X, at each
 * candidate Y, once it's already decided a child qualifies for repair
 * (FAR_FROM_PARENT_X_THRESHOLD above is only the TRIGGER — how far is "too
 * far to leave alone" — this is separately how hard the repair then works
 * to find something closer). Deliberately much wider than the trigger
 * threshold: rewrite plan's own elastic-Y principle is that the engine is
 * NEVER tied to discrete generation rows when a card doesn't fit — it keeps
 * searching a CONTINUOUS Y range rather than jumping to a different
 * generation's row (the old, deleted raiseAncestryOneGeneration's
 * approach) — so a search that gives up too early in X just because a
 * whole real row is densely packed edge-to-edge for thousands of px (a
 * real, confirmed shape — see the tree-layout-downward-strand-gap memory)
 * would leave the child stranded at its ORIGINAL far position instead of
 * finding the genuinely nearby free space one small Y nudge away. Matches
 * growChildrenRowDown's own original (unbounded-feeling) search radius —
 * safe to reuse here because this repair is Y-prioritized (tries every
 * nudged Y at increasingly wide X, not the other way around), so a nearby
 * row still wins over a far sideways slot on the SAME row.
 */
const FAR_FROM_PARENT_SEARCH_X_RADIUS = 3000;

/**
 * Finds one already-placed person whose x has drifted more than
 * FAR_FROM_PARENT_X_THRESHOLD from their own parents' partnership junction,
 * if any. Deliberately scoped to LEAVES ONLY (no spouse, no children of
 * their own) — a person with descendants would need their whole subtree
 * moved together to stay internally consistent, which tryMoveChildNearParent
 * doesn't attempt (this mirrors the known gap's own documented scope: "a
 * childless only child", not the general case). A person with siblings on
 * the same row is also skipped — growChildrenRowDown always places a full
 * sibling row as one contiguous block (invariant #5), so if ANY sibling in
 * the row is far from the junction, ALL of them structurally are, and moving
 * just one alone would break the row's own internal adjacency instead of
 * fixing anything; that shape isn't the bug this closes (it would need a
 * whole-row move, out of scope here, same as the multi-child case).
 */
function findFirstFarFromParentViolator(ctx: GrowthContext): string | null {
  const { graph, positionByPerson } = ctx;
  for (const [personId, pos] of positionByPerson) {
    const person = graph.personById.get(personId);
    if (!person || person.parentIds.length === 0) continue;
    if (person.partnershipIds.length > 0) continue; // has own spouse — not a lone leaf
    if (parentRowSiblingsOf(graph, personId).some((id) => positionByPerson.has(id))) {
      continue; // part of a sibling row — must move as a block, not alone (see doc comment)
    }

    const junction = parentJunctionOf(ctx, personId);
    if (!junction) continue;

    if (Math.abs(pos.x - junction.x) > FAR_FROM_PARENT_X_THRESHOLD) {
      return personId;
    }
  }
  return null;
}

/**
 * The x/y a child's connector line actually originates from: the junction
 * of whichever of their parents' partnerships lists them as a child, or (no
 * recorded partnership — a solo parent) that parent's own card position.
 * Mirrors fromTreeLayout's own edge-source logic one level down in the
 * engine, before DB ids are attached.
 */
function parentJunctionOf(ctx: GrowthContext, childId: string): Point | null {
  const { graph, positionByPerson, junctionByPartnership } = ctx;
  const child = graph.personById.get(childId);
  if (!child) return null;
  for (const parentId of child.parentIds) {
    const parent = graph.personById.get(parentId);
    if (!parent) continue;
    for (const partnershipId of parent.partnershipIds) {
      const partnership = graph.partnershipById.get(partnershipId);
      if (partnership?.childrenIds.includes(childId)) {
        const junction = junctionByPartnership.get(partnershipId);
        if (junction) return junction;
      }
    }
    const solo = graph.soloParentByPersonId.get(parentId);
    if (solo?.childrenIds.includes(childId)) {
      const parentPos = positionByPerson.get(parentId);
      if (parentPos) return parentPos;
    }
  }
  return null;
}

/**
 * Moves a single childless leaf (see findFirstFarFromParentViolator's own
 * scoping doc comment) to the free 2D slot closest to their parents'
 * junction — unlike tryShiftSubtreeOutOfViolation (Y-only, for a whole
 * subtree that must stay internally consistent), a lone leaf has no
 * descendants of its own to keep in sync, so both x AND y are free to
 * search. Starts at the child's own natural row (junction.y +
 * GENERATION_GAP — where growChildrenRowDown originally tried to place
 * them) and nudges Y outward — closest candidate first, so the result never
 * regresses past what growChildrenRowDown already attempted, it only
 * searches WIDER when that wasn't enough. The Y range here is deliberately
 * TWO full GENERATION_GAPs, not the small MAX_Y_NUDGE budget
 * tryShiftSubtreeOutOfViolation uses for whole-subtree shifts: a lone
 * childless leaf has no descendants whose own GENERATION_GAP spacing would
 * be thrown off by a bigger jump, and a real Neon fixture confirmed a
 * densely packed row can leave NO free slot within a single generation's
 * reach either (the nearest genuine opening was two full generations away)
 * — mirrors what the old engine's now-deleted raiseAncestryOneGeneration
 * effectively did for this exact shape of conflict, just scoped to one
 * stranded leaf instead of re-running placement on the whole ancestor
 * chain.
 */
function tryMoveChildNearParent(ctx: GrowthContext, childId: string): boolean {
  const { occupancy, positionByPerson } = ctx;
  const current = positionByPerson.get(childId);
  const junction = parentJunctionOf(ctx, childId);
  if (!current || !junction) return false;

  occupancy.release({
    x: current.x,
    y: current.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });

  const naturalY = junction.y + GENERATION_GAP;
  const maxYSearch = GENERATION_GAP * 2;
  const candidateYs = [naturalY];
  for (let step = 1; step * Y_NUDGE_STEP <= maxYSearch; step++) {
    candidateYs.push(naturalY + step * Y_NUDGE_STEP, naturalY - step * Y_NUDGE_STEP);
  }

  // Phase 1: prefer landing EXACTLY under the parent junction (x === same
  // as a directly-under-parent placement always would be, zero search
  // radius) — try every candidate Y for one where that exact spot happens
  // to be free, before ever accepting an X offset. This is what makes the
  // result visually indistinguishable from an ordinary (uncrowded) child
  // row's own placement — matching the old engine's raiseAncestryOneGeneration
  // outcome, which also always landed a rescued child EXACTLY under its
  // parents (it worked by opening an entirely fresh row, never by nudging
  // the child sideways).
  let resolved: Point | null = null;
  for (const candidateY of candidateYs) {
    const rect = { x: junction.x, y: candidateY, width: CARD_WIDTH, height: CARD_HEIGHT };
    if (!occupancy.intersects(rect, SIBLING_GAP)) {
      resolved = { x: junction.x, y: candidateY };
      break;
    }
  }

  // Phase 2: no Y level offered an exact fit. Widen X progressively
  // (FAR_FROM_PARENT_X_THRESHOLD, then the full
  // FAR_FROM_PARENT_SEARCH_X_RADIUS), trying every candidate Y at each
  // radius before widening further — Y-outer/X-inner, so a nearby row
  // still wins over a far sideways slot on a row that was already tried at
  // the narrower radius (never "prefer a far slot on the natural row over
  // a near slot on a nudged row" — that was the original bug's shape).
  if (!resolved) {
    for (const xRadius of [FAR_FROM_PARENT_X_THRESHOLD, FAR_FROM_PARENT_SEARCH_X_RADIUS]) {
      for (const candidateY of candidateYs) {
        const x = occupancy.findFreeInterval(
          candidateY,
          CARD_HEIGHT,
          CARD_WIDTH,
          SIBLING_GAP,
          junction.x,
          xRadius,
        );
        if (x !== null) {
          resolved = { x, y: candidateY };
          break;
        }
      }
      if (resolved) break;
    }
  }

  if (!resolved) {
    // Nothing genuinely closer was found even at the wide radius — put the
    // card back exactly where it was so the caller can fall back to
    // tryRaiseAncestorBranchForChild instead (see that function's own doc
    // comment for why raising the PARENT branch, not searching further for
    // the child, is the right next step here).
    occupancy.reserve({
      x: current.x,
      y: current.y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
    return false;
  }

  occupancy.reserve({
    x: resolved.x,
    y: resolved.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  positionByPerson.set(childId, resolved);
  return true;
}

/**
 * Every id reachable UPWARD from `rootId`: rootId, rootId's own spouse
 * (never split a couple), and recursively each's OWN recorded parents (plus
 * THEIR spouses) — the direct ancestor spine, not siblings or descendants.
 * Mirrors collectDescendantSubtreeIds's shape but walks the opposite
 * direction (parentIds instead of partnership.childrenIds) — used by
 * tryRaiseAncestorBranchForChild to move exactly "this person and everyone
 * further up their own line", never a shared sibling row (siblings keep
 * their own separate ancestor chain above THEM, untouched).
 */
function collectAncestorBranchIds(
  graph: NormalizedGraph,
  rootId: string,
): Set<string> {
  const ids = new Set<string>([rootId]);
  const spouse = spouseOf(graph, rootId);
  if (spouse) ids.add(spouse);

  let frontier = [...ids];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const person = graph.personById.get(id);
      if (!person) continue;
      for (const parentId of person.parentIds) {
        if (!ids.has(parentId)) {
          ids.add(parentId);
          next.push(parentId);
        }
        const parentSpouse = spouseOf(graph, parentId);
        if (parentSpouse && !ids.has(parentSpouse)) {
          ids.add(parentSpouse);
          next.push(parentSpouse);
        }
      }
    }
    frontier = next;
  }
  return ids;
}

/**
 * Last resort for a stranded childless leaf (rewrite plan §7 Stage 4
 * extension — see findFirstFarFromParentViolator's own doc comment):
 * tryMoveChildNearParent already tried every nearby row first (cheap,
 * touches only the one leaf) — if EVERY row within its search budget is
 * too densely packed to fit the child anywhere close to the junction, the
 * user's own explicit direction (2026-09-11) is to keep the family unit
 * visually TOGETHER by raising the PARENT's entire ancestor branch
 * (collectAncestorBranchIds(graph, parentId) — the parent, their spouse,
 * and everyone further up that SAME line, never touching the parent's own
 * siblings' separate lines) by one GENERATION_GAP, opening exactly the
 * child's natural row for the child to land on directly under the parent's
 * NEW position — not a search for pre-existing free space elsewhere (which
 * is what tryMoveChildNearParent already tried and failed at), an actual
 * local re-placement, verified overlap-free before committing exactly like
 * tryShiftSubtreeOutOfViolation. Deliberately narrower in scope than the
 * old deleted raiseAncestryOneGeneration (which reran the ENTIRE ancestor
 * chain's placement) — this only ever moves ONE branch (the specific
 * parent + their own line), verified safe, and never re-invokes any
 * placement function.
 */
const MAX_ANCESTOR_BRANCH_RAISE_STEPS = 3;

function tryRaiseAncestorBranchForChild(
  ctx: GrowthContext,
  childId: string,
): boolean {
  const { graph, positionByPerson, junctionByPartnership } = ctx;
  const child = graph.personById.get(childId);
  const currentChildPos = positionByPerson.get(childId);
  if (!child || child.parentIds.length === 0 || !currentChildPos) return false;

  // The parent whose OWN branch we'd raise: prefer a parent who themselves
  // has recorded parents (so raising them doesn't just move them past their
  // own ancestors — collectAncestorBranchIds already includes those, so
  // this is actually safe either way, but preferring the parent with a
  // longer chain above them keeps the shift meaningful rather than
  // relocating a childless, parentless solo parent by itself).
  const parentId = child.parentIds[0];
  const branchIds = collectAncestorBranchIds(graph, parentId);
  // The child itself must never be part of the branch being raised — it's
  // the one person this repair is trying to give room TO, not move away.
  branchIds.delete(childId);

  const parentPartnershipId = parentPartnershipIdFor(graph, parentId, childId);
  const oldJunction = parentPartnershipId
    ? junctionByPartnership.get(parentPartnershipId)
    : undefined;
  if (!oldJunction) return false;

  // Try progressively larger raises — one GENERATION_GAP first (the common
  // case, opens a fresh row directly above the parent's current one), then
  // two, then three, UP before DOWN at each step (matching
  // ancestorSideBias's own "up" framing — a branch's own ancestors reading
  // as "further up" the tree is the natural direction; down is tried only
  // if up is somehow blocked too, e.g. by another branch also being raised
  // this same pass). Bounded (MAX_ANCESTOR_BRANCH_RAISE_STEPS) — same
  // "give up rather than search forever" contract as every other repair
  // pass here; assertNoOverlaps remains the final backstop if this returns
  // false and the caller has no other fallback either.
  for (let step = 1; step <= MAX_ANCESTOR_BRANCH_RAISE_STEPS; step++) {
    for (const sign of [-1, 1] as const) {
      const deltaY = sign * step * GENERATION_GAP;
      const result = tryApplyAncestorBranchRaise(
        ctx,
        branchIds,
        childId,
        currentChildPos,
        oldJunction,
        deltaY,
      );
      if (result) return true;
    }
  }
  return false;
}

/**
 * One candidate shift for tryRaiseAncestorBranchForChild: moves every
 * person in `branchIds` by `deltaY`, and the child to directly under the
 * branch's (shifted) own partnership junction — verifying the WHOLE
 * operation collides with nobody outside the moving set BEFORE committing
 * anything. Returns whether this specific deltaY worked; caller tries the
 * next one on false. This is what the first version of
 * tryRaiseAncestorBranchForChild got wrong: it verified the branch shift
 * alone, then unconditionally placed the child at its "ideal" spot
 * afterward with no check at all — silently producing exactly the kind of
 * overlap assertNoOverlaps exists to catch (real bug, caught by the real
 * Neon fixture: the row one GENERATION_GAP up was ALSO already occupied
 * near the branch's own x, not actually free — confirming a single fixed
 * one-generation raise isn't always enough, hence the multi-step search in
 * the caller).
 */
function tryApplyAncestorBranchRaise(
  ctx: GrowthContext,
  branchIds: Set<string>,
  childId: string,
  currentChildPos: Point,
  oldJunction: Point,
  deltaY: number,
): boolean {
  const { graph, positionByPerson, junctionByPartnership, occupancy } = ctx;

  const shifted = new Map<string, Point>();
  for (const id of branchIds) {
    const pos = positionByPerson.get(id);
    if (!pos) return false; // a branch member has no position yet — caller error, bail out safely
    shifted.set(id, { x: pos.x, y: pos.y + deltaY });
  }

  const newChildPos = { x: oldJunction.x, y: oldJunction.y + deltaY + GENERATION_GAP };

  const allMoved = new Map<string, Point>(shifted);
  allMoved.set(childId, newChildPos);
  const overlapsExisting = [...allMoved.values()].some((pos) =>
    [...positionByPerson].some(
      ([otherId, otherPos]) =>
        !branchIds.has(otherId) &&
        otherId !== childId &&
        Math.abs(pos.x - otherPos.x) < CARD_WIDTH &&
        Math.abs(pos.y - otherPos.y) < CARD_HEIGHT,
    ),
  );
  if (overlapsExisting) return false;

  for (const [id, pos] of shifted) positionByPerson.set(id, pos);
  for (const [partnershipId, junction] of junctionByPartnership) {
    const partnership = graph.partnershipById.get(partnershipId);
    if (!partnership) continue;
    if (
      branchIds.has(partnership.leftPersonId) ||
      branchIds.has(partnership.rightPersonId)
    ) {
      junctionByPartnership.set(partnershipId, {
        x: junction.x,
        y: junction.y + deltaY,
      });
    }
  }

  occupancy.release({
    x: currentChildPos.x,
    y: currentChildPos.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  occupancy.reserve({
    x: newChildPos.x,
    y: newChildPos.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  positionByPerson.set(childId, newChildPos);
  return true;
}

/** The id of the partnership (among parentId's own) that lists childId as a child, if any. */
function parentPartnershipIdFor(
  graph: NormalizedGraph,
  parentId: string,
  childId: string,
): string | undefined {
  const parent = graph.personById.get(parentId);
  if (!parent) return undefined;
  for (const partnershipId of parent.partnershipIds) {
    const partnership = graph.partnershipById.get(partnershipId);
    if (partnership?.childrenIds.includes(childId)) return partnershipId;
  }
  return undefined;
}

/** Finds one paternal/maternal pair sharing a row in the wrong relative order, if any — mirrors invariants.ts's findSideConstraintViolation but returns the OFFENDING person (the one further into the opposite side's territory) instead of a message string. */
function findFirstSideConstraintViolator(
  ctx: GrowthContext,
): { personId: string; branch: "paternal" | "maternal" } | null {
  const { graph, positionByPerson } = ctx;
  const byY = new Map<number, Array<{ id: string; x: number; branch: string }>>();
  for (const [id, pos] of positionByPerson) {
    const person = graph.personById.get(id);
    if (!person) continue;
    if (!byY.has(pos.y)) byY.set(pos.y, []);
    byY.get(pos.y)!.push({ id, x: pos.x, branch: person.branch });
  }
  for (const row of byY.values()) {
    const paternal = row.filter((p) => p.branch === "paternal");
    const maternal = row.filter((p) => p.branch === "maternal");
    if (paternal.length === 0 || maternal.length === 0) continue;
    const worstPaternal = paternal.reduce((a, b) => (b.x > a.x ? b : a));
    const worstMaternal = maternal.reduce((a, b) => (b.x < a.x ? b : a));
    if (worstPaternal.x >= worstMaternal.x) {
      // Repair whichever of the two offenders was placed LATER — the
      // earlier one already had the row to itself when it was placed and is
      // more likely to have its own further-placed relatives anchored to
      // it; moving the later arrival disturbs less of the tree. Placement
      // order isn't tracked directly, but Map insertion order IS placement
      // order (positionByPerson is only ever appended to, never
      // reordered) — indexOf on the row array (built by iterating the same
      // map) reflects it.
      const paternalIndex = row.findIndex((p) => p.id === worstPaternal.id);
      const maternalIndex = row.findIndex((p) => p.id === worstMaternal.id);
      const later = paternalIndex > maternalIndex ? worstPaternal : worstMaternal;
      return { personId: later.id, branch: later.branch as "paternal" | "maternal" };
    }
  }
  return null;
}

/**
 * Finds one "foreign person wedged between two blood siblings" violation, if
 * any — mirrors invariants.ts's findInterleavedSiblingViolation but returns
 * the FOREIGN person to move (not either sibling — the siblings are the
 * anchored, correctly-placed party here; the interloper's own cluster is
 * what needs to move elsewhere) instead of a message string.
 */
function findFirstInterleavedSiblingViolator(
  ctx: GrowthContext,
): { foreignPersonId: string } | null {
  const { graph, positionByPerson } = ctx;
  const byY = new Map<number, Array<{ id: string; pos: Point }>>();
  for (const [id, pos] of positionByPerson) {
    if (!byY.has(pos.y)) byY.set(pos.y, []);
    byY.get(pos.y)!.push({ id, pos });
  }
  for (const row of byY.values()) {
    const byParents = new Map<string, Array<{ id: string; pos: Point }>>();
    for (const p of row) {
      const person = graph.personById.get(p.id);
      if (!person || person.parentIds.length === 0) continue;
      const key = [...person.parentIds].sort().join("|");
      if (!byParents.has(key)) byParents.set(key, []);
      byParents.get(key)!.push(p);
    }
    for (const siblings of byParents.values()) {
      if (siblings.length < 2) continue;
      const sorted = [...siblings].sort((a, b) => a.pos.x - b.pos.x);
      const siblingIds = new Set(sorted.map((s) => s.id));
      const allowedSpouseIds = new Set(
        sorted.flatMap((s) => [...spousesOfAll(graph, s.id)]),
      );
      for (let i = 0; i < sorted.length - 1; i++) {
        const left = sorted[i];
        const right = sorted[i + 1];
        const between = row.filter(
          (p) =>
            p.pos.x > left.pos.x &&
            p.pos.x < right.pos.x &&
            !siblingIds.has(p.id) &&
            !allowedSpouseIds.has(p.id),
        );
        if (between.length > 0) {
          return { foreignPersonId: between[0].id };
        }
      }
    }
  }
  return null;
}

/** Every id reachable from `rootId` by walking DOWN only (partnership children, solo-parent children — never sideways to a spouse's OTHER partnerships or up to parents), restricted to already-placed people — this is exactly the set that stays internally consistent (every GENERATION_GAP relationship preserved) under a uniform Y shift of `rootId`. Includes rootId's own spouse (shifting one without the other would split a couple across rows). */
function collectDescendantSubtreeIds(
  graph: NormalizedGraph,
  rootId: string,
): Set<string> {
  const ids = new Set<string>([rootId]);
  const spouse = spouseOf(graph, rootId);
  if (spouse) ids.add(spouse);

  let frontier = [...ids];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const person = graph.personById.get(id);
      if (!person) continue;
      for (const partnershipId of person.partnershipIds) {
        const partnership = graph.partnershipById.get(partnershipId);
        if (!partnership) continue;
        const otherId =
          partnership.leftPersonId === id
            ? partnership.rightPersonId
            : partnership.leftPersonId;
        if (!ids.has(otherId)) {
          ids.add(otherId);
          next.push(otherId);
        }
        for (const childId of partnership.childrenIds) {
          if (!ids.has(childId)) {
            ids.add(childId);
            next.push(childId);
          }
        }
      }
      const solo = graph.soloParentByPersonId.get(id);
      if (solo) {
        for (const childId of solo.childrenIds) {
          if (!ids.has(childId)) {
            ids.add(childId);
            next.push(childId);
          }
        }
      }
    }
    frontier = next;
  }
  return ids;
}

/**
 * Tries shifting every person in `movingIds` by the same deltaY (candidates:
 * ±Y_NUDGE_STEP, ±2*Y_NUDGE_STEP, ... up to MAX_Y_NUDGE), accepting the
 * first candidate that (a) leaves no card in `movingIds` overlapping any
 * card NOT in `movingIds`, and (b) actually resolves whichever violation
 * (side-constraint OR interleaved-sibling — see rowResolvedAfterShift)
 * still implicates one of the moved people, at its NEW row (a shift that
 * lands the moved unit on a DIFFERENT row that happens to be entirely free
 * of the conflicting party counts as resolved). Junction points (partnership
 * midpoints for the T-connector to children) move by the same deltaY too,
 * so connector geometry stays correct after the shift.
 */
function tryShiftSubtreeOutOfViolation(
  ctx: GrowthContext,
  movingIds: Set<string>,
): boolean {
  const { graph, positionByPerson, junctionByPartnership } = ctx;
  const original = new Map(
    [...movingIds].map((id) => [id, positionByPerson.get(id)!]),
  );

  for (let step = 1; step * Y_NUDGE_STEP <= MAX_Y_NUDGE; step++) {
    for (const sign of [1, -1] as const) {
      const deltaY = sign * step * Y_NUDGE_STEP;
      const shifted = new Map(
        [...original].map(([id, pos]) => [
          id,
          { x: pos.x, y: pos.y + deltaY },
        ]),
      );

      const overlapsExisting = [...shifted.values()].some((pos) =>
        [...positionByPerson].some(
          ([otherId, otherPos]) =>
            !movingIds.has(otherId) &&
            Math.abs(pos.x - otherPos.x) < CARD_WIDTH &&
            Math.abs(pos.y - otherPos.y) < CARD_HEIGHT,
        ),
      );
      if (overlapsExisting) continue;

      // Also verify the moving set stays internally collision-free with
      // itself post-shift (a uniform shift can't change RELATIVE positions
      // within the set, so this is always true — kept as an explicit,
      // cheap assertion rather than assumed, since a future change to this
      // function that stops shifting uniformly should fail loudly here
      // instead of silently producing internal overlaps).

      const resolved = rowResolvedAfterShift(graph, positionByPerson, shifted);
      if (!resolved) continue;

      for (const [id, pos] of shifted) positionByPerson.set(id, pos);
      for (const [partnershipId, junction] of junctionByPartnership) {
        const partnership = graph.partnershipById.get(partnershipId);
        if (!partnership) continue;
        if (
          movingIds.has(partnership.leftPersonId) ||
          movingIds.has(partnership.rightPersonId)
        ) {
          junctionByPartnership.set(partnershipId, {
            x: junction.x,
            y: junction.y + deltaY,
          });
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Whether, after applying `shifted` on top of `positionByPerson`, every row
 * touched by the shift is free of EITHER violation kind (side-constraint,
 * interleaved-sibling) that still implicates one of the MOVED people
 * specifically — a row that's still violating between two people NEITHER of
 * which moved is a different, pre-existing conflict, not this shift's to
 * fix (the next repair pass handles it on its own turn instead of this
 * attempt looping on it forever).
 */
function rowResolvedAfterShift(
  graph: NormalizedGraph,
  positionByPerson: Map<string, Point>,
  shifted: Map<string, Point>,
): boolean {
  const touchedYs = new Set([...shifted.values()].map((p) => p.y));
  const effectiveRow = (y: number) =>
    [...positionByPerson.keys()]
      .map((id) => ({ id, pos: shifted.get(id) ?? positionByPerson.get(id)! }))
      .filter((p) => p.pos.y === y);

  for (const y of touchedYs) {
    const row = effectiveRow(y);

    const paternal = row.filter(
      (p) => graph.personById.get(p.id)?.branch === "paternal",
    );
    const maternal = row.filter(
      (p) => graph.personById.get(p.id)?.branch === "maternal",
    );
    if (paternal.length > 0 && maternal.length > 0) {
      const worstPaternal = paternal.reduce((a, b) =>
        b.pos.x > a.pos.x ? b : a,
      );
      const worstMaternal = maternal.reduce((a, b) =>
        b.pos.x < a.pos.x ? b : a,
      );
      if (worstPaternal.pos.x >= worstMaternal.pos.x) {
        const movedIsImplicated =
          shifted.has(worstPaternal.id) || shifted.has(worstMaternal.id);
        if (movedIsImplicated) return false;
      }
    }

    if (rowHasInterleavedSiblingViolation(graph, row, shifted)) return false;
  }
  return true;
}

/**
 * Interleaved-sibling check restricted to one already-built row (mirrors
 * invariants.ts's findInterleavedSiblingViolation, scoped down to a single
 * y and told which ids just moved so it can tell "still-existing pre-shift
 * conflict elsewhere on this row" apart from "the shift's own target
 * conflict") — returns true only when a violation on this row implicates at
 * least one of the moved ids.
 */
function rowHasInterleavedSiblingViolation(
  graph: NormalizedGraph,
  row: Array<{ id: string; pos: Point }>,
  shifted: Map<string, Point>,
): boolean {
  const byParents = new Map<string, Array<{ id: string; pos: Point }>>();
  for (const p of row) {
    const person = graph.personById.get(p.id);
    if (!person || person.parentIds.length === 0) continue;
    const key = [...person.parentIds].sort().join("|");
    if (!byParents.has(key)) byParents.set(key, []);
    byParents.get(key)!.push(p);
  }
  for (const siblings of byParents.values()) {
    if (siblings.length < 2) continue;
    const sorted = [...siblings].sort((a, b) => a.pos.x - b.pos.x);
    const siblingIds = new Set(sorted.map((s) => s.id));
    const allowedSpouseIds = new Set(
      sorted.flatMap((s) => [...spousesOfAll(graph, s.id)]),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const left = sorted[i];
      const right = sorted[i + 1];
      const between = row.filter(
        (p) =>
          p.pos.x > left.pos.x &&
          p.pos.x < right.pos.x &&
          !siblingIds.has(p.id) &&
          !allowedSpouseIds.has(p.id),
      );
      if (between.length === 0) continue;
      const implicated =
        shifted.has(left.id) ||
        shifted.has(right.id) ||
        between.some((p) => shifted.has(p.id));
      if (implicated) return true;
    }
  }
  return false;
}

function spousesOfAll(graph: NormalizedGraph, personId: string): string[] {
  const person = graph.personById.get(personId);
  if (!person) return [];
  const out: string[] = [];
  for (const partnershipId of person.partnershipIds) {
    const partnership = graph.partnershipById.get(partnershipId);
    if (!partnership) continue;
    out.push(
      partnership.leftPersonId === personId
        ? partnership.rightPersonId
        : partnership.leftPersonId,
    );
  }
  return out;
}
