import type {
  NormalizedGraph,
  Partnership,
  Point,
  SubtreeMeasurement,
} from "./types";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  GENERATION_GAP,
  INTER_FAMILY_GAP,
  REMARRIAGE_GAP,
  SIBLING_GAP,
  SPOUSE_GAP,
  measurePartnershipWidth,
  measurePersonWidth,
} from "./subtree";
import { OccupancyModel } from "./occupancy";

export interface PlacementResult {
  positionByPerson: Map<string, Point>;
  junctionByPartnership: Map<string, Point>;
}

/** Cache for subtree.ts's bottom-up width measurements, shared across one placeGraph() run. */
type SubtreeMemo = Map<string, SubtreeMeasurement>;

/**
 * placeGraph — the layout engine's single entry point. Implements the
 * "growing tree" model end to end:
 *
 *   1. Place the focus person at the origin.
 *   2. Grow descendants downward, one branch at a time, each branch
 *      requesting a candidate x position (preferred: centered under its
 *      parent partnership), rejecting candidates that collide with already-
 *      reserved space, and reserving its own footprint once placed.
 *   3. Grow ancestors upward, one generation row at a time, so unrelated
 *      clusters on the same row (paternal grandparents vs maternal
 *      grandparents) see each other's reservations instead of one side
 *      fully recursing before the other even starts (§7/§22/§33 — avoiding
 *      "directionally blind" depth-first ancestor placement).
 *
 * This is measure-then-place, not place-then-fix: subtree.ts computes every
 * width up front, so a candidate's collision check is a simple interval
 * lookup, not a repeated shove-and-recheck loop.
 */
export function placeGraph(graph: NormalizedGraph): PlacementResult {
  const occupancy = new OccupancyModel();
  const positionByPerson = new Map<string, Point>();
  const junctionByPartnership = new Map<string, Point>();
  const memo: SubtreeMemo = new Map();

  const focusId = graph.focusPersonId;
  placePersonBranch(
    graph,
    focusId,
    0,
    0,
    occupancy,
    positionByPerson,
    junctionByPartnership,
    memo,
  );

  placeAncestors(graph, occupancy, positionByPerson, junctionByPartnership);

  return { positionByPerson, junctionByPartnership };
}

// ---------------------------------------------------------------------------
// Descendant growth (downward).
// ---------------------------------------------------------------------------

/**
 * Places one person and, side by side, every partnership/solo-parenthood
 * they participate in (remarriage: each gets its own horizontal slot,
 * separated by REMARRIAGE_GAP) — then recurses into each partnership's
 * children. `anchorX` is the preferred center for this person's own card.
 */
function placePersonBranch(
  graph: NormalizedGraph,
  personId: string,
  anchorX: number,
  y: number,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
  memo: SubtreeMemo,
): void {
  if (positionByPerson.has(personId)) return; // already placed via a spouse's branch
  const person = graph.personById.get(personId);
  if (!person) return;

  const partnerships = person.partnershipIds
    .map((id) => graph.partnershipById.get(id))
    .filter((p): p is Partnership => Boolean(p));
  const solo = graph.soloParentByPersonId.get(personId);

  if (partnerships.length === 0 && !solo) {
    positionByPerson.set(personId, { x: anchorX, y });
    occupancy.reserve({
      x: anchorX,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
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
      occupancy.reserve({
        x: selfX,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      });
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

    placeChildrenRow(
      graph,
      partnership.childrenIds,
      branchCenter,
      y + GENERATION_GAP,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );

    // Remarriage: the spouse just placed at spouseX may themselves have
    // OTHER partnerships (not `personId`'s) — e.g. B, freshly divorced from
    // A, later married F. Those branches did not get a slot in this
    // person's own branchWidths (they belong to the spouse, not to
    // `personId`), so they must grow outward from the spouse's own fixed
    // position instead of being silently skipped (§19/§20 remarriage).
    growSpouseOwnPartnerships(
      graph,
      spouseId,
      partnership.id,
      spouseX,
      y,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );
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
    placeChildrenRow(
      graph,
      solo.childrenIds,
      branchCenter,
      y + GENERATION_GAP,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );
  }
}

/**
 * Grows every partnership a just-placed spouse participates in OTHER than
 * the one that placed them here. Each such partnership is anchored just
 * outside the spouse's card (away from the couple that placed them), so a
 * remarried person's second family reads as its own adjacent branch rather
 * than overlapping or silently vanishing.
 */
function growSpouseOwnPartnerships(
  graph: NormalizedGraph,
  spouseId: string,
  placingPartnershipId: string,
  spouseX: number,
  y: number,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
  memo: SubtreeMemo,
): void {
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

    // The naive mirrored slot can collide with whatever the OTHER spouse's
    // own branch already reserved (e.g. their ex, placed symmetrically on
    // the opposite side) — search outward from the preferred slot for the
    // nearest free interval before reserving (§17 collision avoidance
    // BEFORE placement, not push-then-fix).
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

    const branchCenter = junctionX;
    placeChildrenRow(
      graph,
      partnership.childrenIds,
      branchCenter,
      y + GENERATION_GAP,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );
  }
}

/**
 * Places a row of siblings, each centered within its own already-measured
 * subtree width (never a naive average — §11 "center from actual subtree
 * bounds, not average(child x positions)"), then recurses one generation
 * down into each child's own branches.
 */
function placeChildrenRow(
  graph: NormalizedGraph,
  childrenIds: string[],
  rowCenterX: number,
  y: number,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
  memo: SubtreeMemo,
): void {
  if (childrenIds.length === 0) return;

  const widths = childrenIds.map(
    (id) => measurePersonWidth(graph, id, memo).totalWidth,
  );
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) +
    SIBLING_GAP * Math.max(0, widths.length - 1);

  // The naive center (directly under the parent partnership) can collide
  // with an unrelated branch already reserved on the same row — e.g. a
  // remarried parent's second family's children next to the first family's
  // children (§17/§18: resolve by moving the smallest thing necessary,
  // here the whole sibling row as one unit, keeping relative sibling order
  // and internal spacing untouched rather than reshuffling individuals).
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

    placePersonBranch(
      graph,
      childrenIds[i],
      childCenter,
      y,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );
  }
}

function measureSoloWidth(
  graph: NormalizedGraph,
  childrenIds: string[],
  memo: SubtreeMemo,
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
// Ancestor growth (upward) — row-registry model.
// ---------------------------------------------------------------------------

/**
 * Ancestors grow generation-row by generation-row (not one side fully
 * depth-first before the other starts) so a large paternal branch and a
 * large maternal branch on the SAME row can see and avoid each other's
 * reserved space while still being placed. Each row is processed left-to-
 * right in a deterministic order (paternal side before maternal side at a
 * given row, tie-broken by id) — candidates for each ancestor pair are
 * generated preferring directly above their descendant's midpoint, nudged
 * outward only as far as needed to clear collisions or the inter-family gap.
 */
function placeAncestors(
  graph: NormalizedGraph,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
): void {
  const minGeneration = Math.min(
    0,
    ...[...graph.personById.values()].map((p) => p.generation),
  );

  for (let gen = -1; gen >= minGeneration; gen--) {
    const peopleInRow = [...graph.personById.values()]
      .filter((p) => p.generation === gen && !positionByPerson.has(p.id))
      .sort(
        (a, b) =>
          sideRank(a.branch) - sideRank(b.branch) || a.id.localeCompare(b.id),
      );

    const y = gen * GENERATION_GAP;

    for (const person of peopleInRow) {
      if (positionByPerson.has(person.id)) continue; // may have been placed as a spouse below
      placeAncestorUnit(
        graph,
        person.id,
        y,
        occupancy,
        positionByPerson,
        junctionByPartnership,
      );
    }
  }
}

function sideRank(branch: string): number {
  if (branch === "paternal") return 0;
  if (branch === "maternal") return 2;
  return 1;
}

/**
 * Places one ancestor "unit" (a person, together with their spouse if any)
 * at the best available x for their generation row: preferred candidate is
 * directly above the average x of their already-placed children (the
 * descendants that pulled this ancestor into the graph), falling back to
 * sliding outward — toward paternal=left / maternal=right — until a
 * collision-free interval is found, always keeping at least
 * INTER_FAMILY_GAP from any unrelated same-row cluster.
 */
function placeAncestorUnit(
  graph: NormalizedGraph,
  personId: string,
  y: number,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
): void {
  const person = graph.personById.get(personId);
  if (!person) return;

  const partnershipId = person.partnershipIds.find((id) => {
    const p = graph.partnershipById.get(id);
    return p && (p.leftPersonId === personId || p.rightPersonId === personId);
  });
  const partnership = partnershipId
    ? graph.partnershipById.get(partnershipId)
    : undefined;
  const spouseId = partnership
    ? partnership.leftPersonId === personId
      ? partnership.rightPersonId
      : partnership.leftPersonId
    : undefined;

  const unitWidth = spouseId ? CARD_WIDTH * 2 + SPOUSE_GAP : CARD_WIDTH;

  // Place any not-yet-placed siblings of the descendant that pulled this
  // ancestor pair into the graph BEFORE computing where the parents
  // themselves go — a parent pair must center over the FULL sibling row
  // (every child, not just whichever child happened to be placed first by
  // the earlier downward pass), so the sibling row has to exist first.
  // Placed at this same generation's Y (not the parents' Y) so it doesn't
  // reserve space the parents' own unitWidth still needs.
  const childrenIds =
    partnership?.childrenIds ??
    graph.soloParentByPersonId.get(personId)?.childrenIds ??
    [];
  placeUnplacedSiblings(
    graph,
    childrenIds,
    y + GENERATION_GAP,
    occupancy,
    positionByPerson,
    junctionByPartnership,
  );

  const childPulledX =
    preferredAncestorX(graph, personId, positionByPerson) ??
    preferredAncestorX(graph, spouseId, positionByPerson) ??
    0;

  // Paternal/maternal direction only matters between DIFFERENT ancestor
  // clusters sharing a row (e.g. paternal grandparents vs maternal
  // grandparents) — never inside a single married pair, where one partner
  // is naturally "paternal" (the parent this branch descends from) and the
  // other "maternal" by construction, even though they are one couple that
  // must stay centered on their pulling child, not split apart by a
  // directional bias. So the bias only applies when this ancestor is NOT
  // paired with a spouse of the opposite direction.
  const spouseBranch = spouseId
    ? graph.personById.get(spouseId)?.branch
    : undefined;
  const isOppositeDirectionCouple =
    (person.branch === "paternal" && spouseBranch === "maternal") ||
    (person.branch === "maternal" && spouseBranch === "paternal");

  const direction = isOppositeDirectionCouple
    ? 0
    : person.branch === "maternal"
      ? 1
      : person.branch === "paternal"
        ? -1
        : 0;
  const gap = Math.max(SIBLING_GAP, INTER_FAMILY_GAP);
  const sideBias = (unitWidth / 2 + gap / 2) * direction;
  const preferredX = childPulledX + sideBias;

  const resolvedX = occupancy.findFreeInterval(
    y,
    CARD_HEIGHT,
    unitWidth,
    gap,
    preferredX,
    4000,
    direction,
  );
  const centerX = resolvedX ?? preferredX + direction * gap;

  if (spouseId && partnership) {
    const isLeft = partnership.leftPersonId === personId;
    const selfX = isLeft
      ? centerX - CARD_WIDTH / 2 - SPOUSE_GAP / 2
      : centerX + CARD_WIDTH / 2 + SPOUSE_GAP / 2;
    const spouseX = isLeft
      ? centerX + CARD_WIDTH / 2 + SPOUSE_GAP / 2
      : centerX - CARD_WIDTH / 2 - SPOUSE_GAP / 2;
    positionByPerson.set(personId, { x: selfX, y });
    positionByPerson.set(spouseId, { x: spouseX, y });
    occupancy.reserve({ x: selfX, y, width: CARD_WIDTH, height: CARD_HEIGHT });
    occupancy.reserve({
      x: spouseX,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
    const junctionPoint = {
      x: (selfX + spouseX) / 2,
      y: y + CARD_HEIGHT / 2 + GENERATION_GAP / 2,
    };
    junctionByPartnership.set(partnership.id, junctionPoint);
  } else {
    positionByPerson.set(personId, { x: centerX, y });
    occupancy.reserve({
      x: centerX,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  }
}

/**
 * Places any children of an ancestor partnership that aren't placed yet —
 * i.e. siblings of whichever descendant already pulled this ancestor pair
 * into the graph. Already-placed children (typically the focus person, or a
 * descendant already grown from the main downward pass) are left exactly
 * where they are; each unplaced sibling is anchored immediately next to its
 * nearest already-placed sibling's OWN card — not next to that sibling's
 * spouse, even when the spouse happens to occupy the nearer-looking side.
 *
 * A full sibling belongs right beside the person they're related to by
 * blood: if that person has a spouse sitting on one side, the sibling goes
 * on the OTHER side (immediately adjacent to the blood relative, not
 * "wherever the first free slot happens to be") — jumping past a spouse to
 * land further out reads as "unrelated person next to my sister's husband,"
 * which breaks the sibling-adjacency rule even though geometrically nothing
 * overlaps.
 */
function placeUnplacedSiblings(
  graph: NormalizedGraph,
  childrenIds: string[],
  y: number,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
): void {
  const unplaced = childrenIds.filter((id) => !positionByPerson.has(id));
  if (unplaced.length === 0) return;

  const placedSiblingIds = childrenIds.filter((id) => positionByPerson.has(id));

  for (const childId of unplaced) {
    // Anchor on the most recently placed BLOOD sibling's own card — not an
    // average of the whole row, which could sit anywhere once spouses are
    // folded in — so each new sibling lands directly beside a relative,
    // preferring whichever side of that relative isn't already taken by
    // their own spouse.
    const nearestSiblingId = placedSiblingIds[placedSiblingIds.length - 1];
    const anchorX = nearestSiblingId
      ? positionByPerson.get(nearestSiblingId)!.x
      : 0;

    const leftCandidateX = anchorX - CARD_WIDTH - SIBLING_GAP;
    const rightCandidateX = anchorX + CARD_WIDTH + SIBLING_GAP;
    const leftFree = !occupancy.intersects(
      { x: leftCandidateX, y, width: CARD_WIDTH, height: CARD_HEIGHT },
      SIBLING_GAP,
    );
    const rightFree = !occupancy.intersects(
      { x: rightCandidateX, y, width: CARD_WIDTH, height: CARD_HEIGHT },
      SIBLING_GAP,
    );

    // Prefer whichever immediately-adjacent side is free; if both are
    // free, prefer left (deterministic tie-break, §39). Only fall back to
    // searching further outward when NEITHER immediately-adjacent slot is
    // actually free (e.g. that side is blocked by an unrelated branch).
    let resolvedX: number;
    if (leftFree) {
      resolvedX = leftCandidateX;
    } else if (rightFree) {
      resolvedX = rightCandidateX;
    } else {
      resolvedX =
        occupancy.findFreeInterval(
          y,
          CARD_HEIGHT,
          CARD_WIDTH,
          SIBLING_GAP,
          leftCandidateX,
          3000,
          -1,
        ) ??
        occupancy.findFreeInterval(
          y,
          CARD_HEIGHT,
          CARD_WIDTH,
          SIBLING_GAP,
          rightCandidateX,
          3000,
          1,
        ) ??
        leftCandidateX;
    }

    positionByPerson.set(childId, { x: resolvedX, y });
    occupancy.reserve({
      x: resolvedX,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
    placedSiblingIds.push(childId);

    // This sibling may themselves have partnerships/descendants — grow
    // those too, same as any other branch (§13 subtree = space applies
    // recursively here as well).
    growPersonDescendants(
      graph,
      childId,
      resolvedX,
      y,
      occupancy,
      positionByPerson,
      junctionByPartnership,
    );
  }
}

/**
 * Grows a person's own partnerships/descendants after they've ALREADY been
 * placed at a fixed x (e.g. as a newly-placed sibling in
 * placeUnplacedSiblings) — mirrors the branch-growing half of
 * placePersonBranch, but anchors each partnership relative to the person's
 * real card position instead of computing it from scratch.
 */
function growPersonDescendants(
  graph: NormalizedGraph,
  personId: string,
  personX: number,
  y: number,
  occupancy: OccupancyModel,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
): void {
  const memo: SubtreeMemo = new Map();
  const person = graph.personById.get(personId);
  if (!person) return;

  const partnerships = person.partnershipIds
    .map((id) => graph.partnershipById.get(id))
    .filter((p): p is Partnership => Boolean(p));
  const solo = graph.soloParentByPersonId.get(personId);
  if (partnerships.length === 0 && !solo) return;

  for (const partnership of partnerships) {
    if (junctionByPartnership.has(partnership.id)) continue; // already grown from the other spouse's side
    const isLeft = partnership.leftPersonId === personId;
    const spouseId = isLeft
      ? partnership.rightPersonId
      : partnership.leftPersonId;
    if (positionByPerson.has(spouseId)) continue; // spouse placed elsewhere — avoid double placement

    const preferredSpouseX = isLeft
      ? personX + CARD_WIDTH / 2 + SPOUSE_GAP / 2 + CARD_WIDTH / 2
      : personX - CARD_WIDTH / 2 - SPOUSE_GAP / 2 - CARD_WIDTH / 2;
    const direction = isLeft ? 1 : -1;
    const spouseX =
      occupancy.findFreeInterval(
        y,
        CARD_HEIGHT,
        CARD_WIDTH,
        REMARRIAGE_GAP,
        preferredSpouseX,
        2000,
        direction,
      ) ?? preferredSpouseX;

    positionByPerson.set(spouseId, { x: spouseX, y });
    occupancy.reserve({
      x: spouseX,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });

    const junctionX = (personX + spouseX) / 2;
    const junctionY = y + CARD_HEIGHT / 2 + GENERATION_GAP / 2;
    junctionByPartnership.set(partnership.id, { x: junctionX, y: junctionY });

    placeChildrenRow(
      graph,
      partnership.childrenIds,
      junctionX,
      y + GENERATION_GAP,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );
  }

  if (solo) {
    placeChildrenRow(
      graph,
      solo.childrenIds,
      personX,
      y + GENERATION_GAP,
      occupancy,
      positionByPerson,
      junctionByPartnership,
      memo,
    );
  }
}

/** Average x of this person's already-placed children — the pull that determines where an ancestor "wants" to grow. */
function preferredAncestorX(
  graph: NormalizedGraph,
  personId: string | undefined,
  positionByPerson: Map<string, Point>,
): number | null {
  if (!personId) return null;
  const person = graph.personById.get(personId);
  if (!person) return null;

  const childIds: string[] = [];
  for (const partnershipId of person.partnershipIds) {
    const p = graph.partnershipById.get(partnershipId);
    if (p) childIds.push(...p.childrenIds);
  }
  const solo = graph.soloParentByPersonId.get(personId);
  if (solo) childIds.push(...solo.childrenIds);

  const placedX = childIds
    .map((id) => positionByPerson.get(id)?.x)
    .filter((x): x is number => typeof x === "number");
  if (placedX.length === 0) return null;
  return placedX.reduce((a, b) => a + b, 0) / placedX.length;
}
