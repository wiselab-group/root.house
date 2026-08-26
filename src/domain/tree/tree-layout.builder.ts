/**
 * tree-layout.builder.ts — converts the Person+Relationship graph into a
 * generic, library-agnostic layout: nodes with (x, y, generation) and edges.
 *
 * This is the ONE place that decides how a family tree is laid out visually.
 * It has NO knowledge of @xyflow/react or any other rendering library — the
 * adapter layer (components/tree/adapters/xyflow-adapter.ts) is responsible
 * for translating TreeLayoutGraph into whatever a specific graph-viz library
 * needs. This split is what lets us add ancestors-only/descendants-only/
 * genogram/timeline views later (each a new builder function producing the
 * same TreeLayoutGraph shape) without touching the database or the viz lib.
 *
 * LAYOUT MODEL: one single recursive tree of "units" (a couple, or a solo
 * person), not a row-per-generation model. Every unit in the whole visible
 * tree — not just the focus couple — is laid out the same way:
 *   - the two partners always sit immediately adjacent (PARTNER_X_SPACING
 *     apart — deliberately tighter than the UNIT_X_SPACING used everywhere
 *     else, so a couple visually reads as its own separated family cell
 *     rather than blending into the row of unrelated/sibling cards around
 *     it), regardless of how wide anything else around them grows;
 *   - the husband's own upward ancestor fan spreads further LEFT from him,
 *     the wife's spreads further RIGHT from her, recursively at every
 *     generation up (a classic ahnentafel/ancestor-chart fan);
 *   - the unit's children spread out below, centered under the couple —
 *     and each child who is ITSELF part of a couple (partnered) becomes the
 *     root of its own nested up/down layout: that partner's own ancestor
 *     fan (a whole separate family line the child married into) fans out
 *     from THAT child's position, not from the top-level focus couple.
 *
 * This is what makes the layout collision-free at ANY depth in EITHER
 * direction: a descendant's spouse's own parents (in-laws several
 * generations removed from the focus person) get their own correctly-
 * reserved width fanning out from that descendant, exactly like the focus
 * couple's own parents do from the focus couple — earlier revisions of
 * this file special-cased "ancestors of focus" (a fan) vs. "everything
 * else" (a shared row per generation), which is what caused two unrelated
 * branches meeting several generations away from focus to silently overlap
 * once the tree was wide enough (see git history for the exact bug this
 * replaced) — a shared-row model has no notion of "how wide is the stuff
 * ABOVE this specific row's ancestor branch", so it can't reserve space for
 * it. A single recursive width calculation, post-order, is what actually
 * guarantees every subtree gets the room it needs, all the way up AND down.
 *
 * A person's siblings (not itself a partner/ancestor/descendant of the
 * relevant unit, just riding along) join right beside them in the same
 * slot their branch already occupies — they don't get a branch of their
 * own, in either direction.
 */

export interface PersonNode {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  photoMediaId: string | null;
  /** Present so tree-filter.ts can match on them without a second Person lookup — not used by layout positioning itself. */
  gender: "male" | "female" | "unknown";
  religion: string | null;
  nationality: string | null;
}

export interface ParentChildEdgeInput {
  parentId: string;
  childId: string;
}

export interface PartnershipEdgeInput {
  person1Id: string;
  person2Id: string;
  isCurrent: boolean;
}

export interface BuildTreeLayoutInput {
  persons: PersonNode[];
  parentChildEdges: ParentChildEdgeInput[];
  partnershipEdges: PartnershipEdgeInput[];
  focusPersonId: string;
  /** Generations of ancestors to include above focusPersonId. Default 2 (parents + grandparents). */
  ancestorGenerations?: number;
  /** Generations of descendants to include below focusPersonId. Default 2 (children + grandchildren). */
  descendantGenerations?: number;
}

export type LayoutNodeKind = "person";

export interface LayoutNode {
  id: string; // == personId, one node per person in the visible slice
  kind: LayoutNodeKind;
  personId: string;
  x: number;
  y: number;
  /** 0 = focus person's generation, negative = ancestors, positive = descendants. */
  generation: number;
  isFocus: boolean;
  person: PersonNode;
}

export type LayoutEdgeKind = "parent_child" | "partnership";

export interface LayoutEdge {
  id: string;
  kind: LayoutEdgeKind;
  source: string; // personId
  target: string; // personId
  isCurrent?: boolean; // partnership edges only
}

export interface TreeLayoutGraph {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  focusPersonId: string;
}

const GENERATION_Y_SPACING = 180;
// PersonNode's rendered width (220px, see xyflow-adapter.ts) plus a fixed
// gutter between adjacent cards (PARTNER_GAP). This is ONLY the gap between
// two PARTNERS (husband/wife) — the tightest seam in the whole tree, so a couple
// visually reads as one family unit. Every other seam (siblings, unrelated
// units) uses UNIT_X_SPACING instead, specifically so a partnership doesn't
// look the same distance apart as two people who just happen to be adjacent
// (see UNIT_X_SPACING's own doc).
const CARD_WIDTH = 220;
const PARTNER_GAP = 40;
const PARTNER_X_SPACING = CARD_WIDTH + PARTNER_GAP;
// The seam between any two adjacent cards that are NOT partners of each
// other — two siblings, a sibling riding beside a couple, two unrelated
// family branches meeting in the same generation, two separate child
// families in a children row. Deliberately a SEPARATE gap constant, not
// PARTNER_GAP doubled outright as a spacing multiplier: CARD_WIDTH is a
// large constant baked into both spacing numbers, so doubling
// PARTNER_X_SPACING itself (244*2=488) blows up the VISIBLE edge-to-edge
// gap once the fixed 220px card width is subtracted back out (24px -> way
// more than 2x). UNIT_GAP is the actual visible gap this seam should have;
// spacing = CARD_WIDTH + UNIT_GAP restores the same "card width + gutter"
// relationship PARTNER_X_SPACING uses. Without a wider seam here, a sibling
// standing next to someone ended up the exact same distance away as that
// person's own spouse, so the tree read as one undifferentiated row of
// cards instead of visually grouping each couple together (see
// layoutUnit's width math for how the couple's own tighter gap and this
// wider one combine into the final layout).
const UNIT_GAP = 60;
const UNIT_X_SPACING = CARD_WIDTH + UNIT_GAP;

const DEFAULT_ANCESTOR_GENERATIONS = 2;
const DEFAULT_DESCENDANT_GENERATIONS = 2;

type Gender = "male" | "female" | "unknown";

/**
 * Builds a "focus tree" layout: the focus person centered, ancestors above
 * (by generation), descendants below, spouses beside their partner. See
 * the file header comment for the recursive-units layout model.
 */
export function buildFocusTreeLayout(
  input: BuildTreeLayoutInput,
): TreeLayoutGraph {
  const {
    persons,
    parentChildEdges,
    focusPersonId,
    ancestorGenerations = DEFAULT_ANCESTOR_GENERATIONS,
    descendantGenerations = DEFAULT_DESCENDANT_GENERATIONS,
  } = input;

  const personsById = new Map(persons.map((p) => [p.id, p]));
  if (!personsById.has(focusPersonId)) {
    return { nodes: [], edges: [], focusPersonId };
  }

  const parentsOf = groupBy(
    parentChildEdges,
    (e) => e.childId,
    (e) => e.parentId,
  );
  const childrenOf = groupBy(
    parentChildEdges,
    (e) => e.parentId,
    (e) => e.childId,
  );
  const partnerOf = new Map<string, string>();
  for (const { person1Id, person2Id } of input.partnershipEdges) {
    partnerOf.set(person1Id, person2Id);
    partnerOf.set(person2Id, person1Id);
  }
  const genderOf = new Map<string, Gender>(persons.map((p) => [p.id, p.gender]));

  // generation: personId -> integer offset from focus (0 = focus's generation)
  const generationOf = new Map<string, number>([[focusPersonId, 0]]);
  // How many ancestor/descendant "hops" a person is from the nearest node
  // whose own BFS actually reached them (focusPersonId starts at 0 for
  // both). A sibling or partner added mid-pass inherits their anchor's own
  // remaining budget — they did not themselves cost a hop, they're a
  // lateral join at the same generation — so their ancestors/descendants
  // must still expand the full ancestorGenerations/descendantGenerations
  // from THAT anchor's own depth-so-far, not from a stunted budget.
  const ancestorDepthOf = new Map<string, number>([[focusPersonId, 0]]);
  const descendantDepthOf = new Map<string, number>([[focusPersonId, 0]]);

  // Multi-source BFS: every person discovered (via ancestor/descendant
  // traversal, sibling expansion, or partnership) is itself a source for
  // further ancestor/descendant traversal, sibling expansion, and
  // partnership joins — run all three to a fixed point together. (See git
  // history for why a single non-iterative pass isn't enough: a partner or
  // sibling pulled in by a later pass would otherwise be a dead end whose
  // own further family never gets traversed.)
  let addedAny = true;
  while (addedAny) {
    addedAny = false;

    for (const [personId, depth] of [...ancestorDepthOf]) {
      if (depth >= ancestorGenerations) continue;
      const generation = generationOf.get(personId)!;
      for (const parentId of parentsOf.get(personId) ?? []) {
        const isNew = !generationOf.has(parentId);
        if (isNew) {
          generationOf.set(parentId, generation - 1);
          addedAny = true;
        }
        if (!ancestorDepthOf.has(parentId) || ancestorDepthOf.get(parentId)! > depth + 1) {
          ancestorDepthOf.set(parentId, depth + 1);
          addedAny = true;
        }
      }
    }

    for (const [personId, depth] of [...descendantDepthOf]) {
      if (depth >= descendantGenerations) continue;
      const generation = generationOf.get(personId)!;
      for (const childId of childrenOf.get(personId) ?? []) {
        const isNew = !generationOf.has(childId);
        if (isNew) {
          generationOf.set(childId, generation + 1);
          addedAny = true;
        }
        if (!descendantDepthOf.has(childId) || descendantDepthOf.get(childId)! > depth + 1) {
          descendantDepthOf.set(childId, depth + 1);
          addedAny = true;
        }
      }
    }

    for (const [personId, generation] of [...generationOf]) {
      for (const parentId of parentsOf.get(personId) ?? []) {
        const parentAncestorDepth = ancestorDepthOf.get(parentId);
        for (const siblingId of childrenOf.get(parentId) ?? []) {
          if (!generationOf.has(siblingId)) {
            generationOf.set(siblingId, generation);
            addedAny = true;
          }
          if (parentAncestorDepth !== undefined) {
            const siblingBudget = parentAncestorDepth + 1;
            if (!ancestorDepthOf.has(siblingId) || ancestorDepthOf.get(siblingId)! > siblingBudget) {
              ancestorDepthOf.set(siblingId, siblingBudget);
              addedAny = true;
            }
          }
          if (!descendantDepthOf.has(siblingId)) {
            descendantDepthOf.set(siblingId, 0);
            addedAny = true;
          }
        }
      }
    }

    for (const { person1Id, person2Id } of input.partnershipEdges) {
      const generation1 = generationOf.get(person1Id);
      const generation2 = generationOf.get(person2Id);
      if (generation1 !== undefined && generation2 === undefined) {
        generationOf.set(person2Id, generation1);
        addedAny = true;
      } else if (generation2 !== undefined && generation1 === undefined) {
        generationOf.set(person1Id, generation2);
        addedAny = true;
      }

      if (generationOf.has(person1Id) && generationOf.has(person2Id)) {
        if (mergeBudget(ancestorDepthOf, person1Id, person2Id)) addedAny = true;
        if (mergeBudget(descendantDepthOf, person1Id, person2Id)) addedAny = true;
      }
    }
  }

  const visibleIds = new Set(generationOf.keys());
  const visited = new Set<string>();
  const ctx: LayoutContext = { visibleIds, parentsOf, childrenOf, partnerOf, genderOf, visited };

  // layoutUnit already handles its OWN root's partner internally (their own
  // ancestor fan, nested exactly like any other couple in the tree — see
  // its doc) — the focus person is laid out exactly the same way any other
  // person in the tree is, no separate top-level "couple" special-casing
  // needed. `side` only matters for tie-breaking which way things the focus
  // person's OWN further-nested units grow; "right" is an arbitrary but
  // stable choice (their own partner still gets rootId's outward side,
  // "right" here, per layoutUnit's own partner-placement rule).
  const focusUnit = layoutUnit(focusPersonId, "right", ctx);

  const nodes: LayoutNode[] = [];
  for (const slot of focusUnit.slots) {
    const person = personsById.get(slot.id);
    if (!person) continue;
    nodes.push({
      id: slot.id,
      kind: "person",
      personId: slot.id,
      x: slot.relativeX,
      y: slot.relativeGeneration * GENERATION_Y_SPACING,
      generation: slot.relativeGeneration,
      isFocus: slot.id === focusPersonId,
      person,
    });
  }

  const edges: LayoutEdge[] = [];
  for (const edge of parentChildEdges) {
    if (visibleIds.has(edge.parentId) && visibleIds.has(edge.childId)) {
      edges.push({
        id: `pc-${edge.parentId}-${edge.childId}`,
        kind: "parent_child",
        source: edge.parentId,
        target: edge.childId,
      });
    }
  }
  for (const edge of input.partnershipEdges) {
    if (visibleIds.has(edge.person1Id) && visibleIds.has(edge.person2Id)) {
      edges.push({
        id: `partner-${edge.person1Id}-${edge.person2Id}`,
        kind: "partnership",
        source: edge.person1Id,
        target: edge.person2Id,
        isCurrent: edge.isCurrent,
      });
    }
  }

  return { nodes, edges, focusPersonId };
}

function groupBy<T, K, V>(
  items: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => V,
): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(valueFn(item));
  }
  return map;
}

/**
 * Two people joined as partners/siblings should share one "remaining
 * traversal budget" going forward — whichever of the pair has already used
 * less of their budget (i.e. has more depth left, or wasn't budgeted yet)
 * wins for both, since real family membership doesn't reset at a marriage.
 * Returns true if either side's budget changed (i.e. more BFS work to do).
 */
function mergeBudget(
  depthOf: Map<string, number>,
  id1: string,
  id2: string,
): boolean {
  const depth1 = depthOf.get(id1);
  const depth2 = depthOf.get(id2);
  if (depth1 === undefined && depth2 === undefined) return false;
  const merged = Math.min(depth1 ?? Infinity, depth2 ?? Infinity);
  let changed = false;
  if (depth1 === undefined || depth1 > merged) {
    depthOf.set(id1, merged);
    changed = true;
  }
  if (depth2 === undefined || depth2 > merged) {
    depthOf.set(id2, merged);
    changed = true;
  }
  return changed;
}

/**
 * Orders a couple (0, 1, or 2 ids — already filtered to "visible and not
 * yet placed") as [left, right] — male on the left, female on the right
 * when gender is known and they differ; a stable fallback (sorted id) keeps
 * output deterministic when gender is 'unknown', both partners share one,
 * or the two ids aren't actually partners of each other (e.g. two parents
 * who were never partnered, just both recorded — nothing to sensibly call
 * "husband/wife" order there), so the same input always renders the same
 * way rather than flipping between renders.
 */
interface OrderedCouple {
  leftId: string | null;
  rightId: string | null;
  /**
   * True when leftId/rightId are partners of each other (the common case:
   * two recorded parents who were married/partnered). Callers MUST check
   * this before laying out leftId and rightId as two SEPARATE layoutUnit
   * calls: when true, layoutUnit(leftId, ...) already places rightId as
   * leftId's own partner internally (see layoutUnit's hasPartner
   * handling) — calling layoutUnit(rightId, ...) again afterward would lay
   * rightId out a SECOND time, duplicated. Only actually call layoutUnit
   * for both ids separately when this is false (two recorded parents who
   * were never partnered with each other — nothing to dedupe).
   */
  arePartners: boolean;
}

function orderCoupleBySlot(
  ids: string[],
  partnerOf: Map<string, string>,
  genderOf: Map<string, Gender>,
): OrderedCouple {
  if (ids.length === 0) return { leftId: null, rightId: null, arePartners: false };
  if (ids.length === 1) return { leftId: ids[0], rightId: null, arePartners: false };

  const [a, b] = ids;
  const arePartners = partnerOf.get(a) === b;
  if (!arePartners) {
    const [leftId, rightId] = [...ids].sort();
    return { leftId, rightId, arePartners: false };
  }
  const genderA = genderOf.get(a) ?? "unknown";
  const genderB = genderOf.get(b) ?? "unknown";
  if (genderA === "male" && genderB === "female") return { leftId: a, rightId: b, arePartners: true };
  if (genderA === "female" && genderB === "male") return { leftId: b, rightId: a, arePartners: true };
  const [leftId, rightId] = [...ids].sort();
  return { leftId, rightId, arePartners: true };
}

interface LayoutContext {
  visibleIds: Set<string>;
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  partnerOf: Map<string, string>;
  genderOf: Map<string, Gender>;
  /** Shared across the WHOLE recursion (both directions) — every person is placed exactly once, however many paths could reach them. */
  visited: Set<string>;
}

/** One placed person anywhere in the tree, in the whole tree's shared generation-relative x (0 = focus's own generation/x). */
interface UnitSlot {
  id: string;
  relativeX: number;
  relativeGeneration: number;
}

/**
 * Lays out person `rootId`'s own subtree — their upward ancestor fan AND
 * their downward descendants — plus any of `rootId`'s siblings riding
 * beside them in this same slot (see file header comment: a sibling
 * doesn't get a branch of its own). This is the ONE recursive function
 * that lays out the entire tree in both directions: called once for the
 * focus person (from buildFocusTreeLayout) and then again, recursively,
 * for every ancestor AND every descendant (whether or not they're
 * partnered) it finds along the way.
 *
 * INVARIANT this function guarantees, for every caller to rely on without
 * re-checking: rootId sits at relativeX EXACTLY 0 (at its own
 * relativeGeneration 0), and EVERY other slot in the returned subtree
 * (siblings, ancestors, descendants, any of THEIR siblings/partners,
 * arbitrarily deep in either direction) has an outwardX (relativeX for
 * side="right", or -relativeX for side="left") that is >= 0 — i.e. the
 * whole subtree only ever extends AWAY from rootId's own position, never
 * back across it toward wherever a sibling unit will be placed. This is
 * what lets every caller (this function's own recursive calls, and
 * buildFocusTreeLayout's top-level couple) place two adjacent units at a
 * FIXED spacing apart, always, regardless of how wide either
 * one's own subtree grows in ANY direction — units can never collide by
 * construction, in contrast to a shared-row-per-generation model, which
 * has no way to reserve room for what's happening several generations
 * away in an unrelated branch (see file header comment for the bug this
 * replaced).
 *
 * `width` is the subtree's outward extent (0 = just rootId, no one else
 * extends further out) — how far the caller needs to keep clear beyond
 * rootId's own position on this subtree's outward side.
 */
/** Per-generation occupied x-range (in whatever relative coordinate space the slots are already in) — the actual collision-detection unit used everywhere in this file. */
type ExtentByGeneration = Map<number, { min: number; max: number }>;

function computeExtentByGeneration(slots: UnitSlot[]): ExtentByGeneration {
  const extent: ExtentByGeneration = new Map();
  for (const slot of slots) {
    const existing = extent.get(slot.relativeGeneration);
    if (!existing) {
      extent.set(slot.relativeGeneration, { min: slot.relativeX, max: slot.relativeX });
    } else {
      existing.min = Math.min(existing.min, slot.relativeX);
      existing.max = Math.max(existing.max, slot.relativeX);
    }
  }
  return extent;
}

/**
 * How much an incoming subtree (whose own extentByGeneration is in ITS
 * local coordinates, not yet offset) needs to be pushed by, on top of a
 * `desiredOffset`, so that once shifted by (desiredOffset + push) it no
 * longer overlaps `existingExtent` on any generation they share (with at
 * least PARTNER_X_SPACING clearance as a minimum collision buffer (the same
 * minimum floor whether the incoming piece is a partner, a sibling, or an
 * unrelated branch — the wider UNIT_X_SPACING seams between non-partners
 * come from the desiredOffset callers request, not from this floor)
 * in this file). `direction` is +1 (incoming subtree sits to the right/
 * below-right of existing content, so push it further right if needed) or
 * -1 (sits to the left, push further left). Returns 0 if there's no
 * collision at `desiredOffset` already.
 */
function resolveCollision(
  existingExtent: ExtentByGeneration,
  incomingExtent: ExtentByGeneration,
  desiredOffset: number,
  direction: 1 | -1,
): number {
  let extraPush = 0;
  for (const [generation, incoming] of incomingExtent) {
    const existing = existingExtent.get(generation);
    if (!existing) continue;
    const incomingMin = incoming.min + desiredOffset + (direction === 1 ? extraPush : -extraPush);
    const incomingMax = incoming.max + desiredOffset + (direction === 1 ? extraPush : -extraPush);
    if (direction === 1) {
      // Incoming sits to the right — its own min edge must clear existing's max edge.
      const shortfall = existing.max + PARTNER_X_SPACING - incomingMin;
      if (shortfall > 0) extraPush += shortfall;
    } else {
      // Incoming sits to the left — its own max edge must clear existing's min edge.
      const shortfall = incomingMax - (existing.min - PARTNER_X_SPACING);
      if (shortfall > 0) extraPush += shortfall;
    }
  }
  return extraPush;
}

function mergeExtent(target: ExtentByGeneration, incoming: ExtentByGeneration, offset: number): void {
  for (const [generation, { min, max }] of incoming) {
    const existing = target.get(generation);
    const shiftedMin = min + offset;
    const shiftedMax = max + offset;
    if (!existing) {
      target.set(generation, { min: shiftedMin, max: shiftedMax });
    } else {
      existing.min = Math.min(existing.min, shiftedMin);
      existing.max = Math.max(existing.max, shiftedMax);
    }
  }
}

/**
 * Finds personId's own siblings (same recorded parents, still visible, not
 * already claimed by someone else's own layoutUnit call) and marks them
 * visited. Shared between rootId and rootId's own partner in layoutUnit
 * (see COUPLE SYMMETRY note there) — a partner is a full person with their
 * own sibling group too, not just an inline placeholder, so this must run
 * for them exactly the same way it runs for rootId.
 */
function collectSiblings(personId: string, ctx: LayoutContext): string[] {
  const parents = ctx.parentsOf.get(personId) ?? [];
  const siblingIds: string[] = [];
  for (const parentId of parents) {
    for (const childId of ctx.childrenOf.get(parentId) ?? []) {
      if (
        childId !== personId &&
        ctx.visibleIds.has(childId) &&
        !ctx.visited.has(childId) &&
        !siblingIds.includes(childId)
      ) {
        siblingIds.push(childId);
        ctx.visited.add(childId);
      }
    }
  }
  return siblingIds;
}

function layoutUnit(
  rootId: string,
  side: "left" | "right",
  ctx: LayoutContext,
): { width: number; slots: UnitSlot[]; extentByGeneration: ExtentByGeneration } {
  ctx.visited.add(rootId);
  const outward = side === "left" ? -1 : 1;

  // COUPLE SYMMETRY: rootId's partner (if visible, not already placed) is
  // a full person with their OWN siblings and OWN parents, not a
  // simplified afterthought — this must be computed the exact same way
  // rootId's own siblings/parents are, via the same collectSiblings/
  // layoutCoupleFan calls, or the partner's sibling group ends up
  // orphaned into whatever OTHER subtree happens to discover them first
  // (a real bug this fixes: galinaSib2/galinaSib3 used to get placed as
  // descendants of parent2's own layoutUnit call instead of riding beside
  // galina in her own row, because galina herself never went through
  // collectSiblings at all — only rootId did).
  const partnerId = ctx.partnerOf.get(rootId);
  const hasPartner = partnerId != null && ctx.visibleIds.has(partnerId) && !ctx.visited.has(partnerId);
  if (hasPartner) ctx.visited.add(partnerId!);

  // rootId's siblings (same parents, still visible, not already placed by
  // an outer call) ride beside them in this same row, extending outward.
  const siblingIds = collectSiblings(rootId, ctx);
  const partnerSiblingIds = hasPartner ? collectSiblings(partnerId!, ctx) : [];

  // rootId's own parents (if visible) become this subtree's own further
  // ancestor fan, nested entirely on this subtree's outward side (see
  // placement below): a grandparent's own fan never crosses back toward
  // rootId's position, by this function's own invariant applied
  // recursively. layoutCoupleFan handles the actual recursion (see its own
  // doc for why it must be the one deciding how many layoutUnit calls to
  // make, not this function calling layoutUnit directly for both parents).
  const parents = ctx.parentsOf.get(rootId) ?? [];
  const parentFan = layoutCoupleFan(
    parents.filter((id) => ctx.visibleIds.has(id) && !ctx.visited.has(id)),
    ctx,
  );

  // Which side the partner sits on relative to rootId — a LOCAL rule
  // (husband left, wife right of EACH OTHER — see file header comment)
  // that's deliberately independent of `outward`/`side`: `side` says which
  // way THIS UNIT'S OWN subtree should grow relative to whatever placed
  // it (e.g. "this is the husband's own branch, growing further left of
  // the couple above"), which is a completely different question from
  // "where does MY OWN partner sit relative to ME" — conflating the two
  // (an earlier version of this function did) put the wife on the wrong
  // side of her husband whenever `side` and gender disagreed (e.g. a
  // female root whose own branch still needs to grow further "outward"
  // in the `side="left"` sense — her own husband must still end up to
  // HER left, i.e. even FURTHER in that same outward direction, not
  // flipped back toward the couple above). partnerSide falls back to
  // `outward` only when gender is unknown (nothing to key the local
  // order off, so any deterministic direction is as good as another).
  const partnerSide: 1 | -1 = hasPartner
    ? (() => {
        const rootGender = ctx.genderOf.get(rootId) ?? "unknown";
        const partnerGender = ctx.genderOf.get(partnerId!) ?? "unknown";
        if (rootGender === "male" && partnerGender === "female") return 1;
        if (rootGender === "female" && partnerGender === "male") return -1;
        return outward as 1 | -1;
      })()
    : (outward as 1 | -1);
  const partnerParents = hasPartner ? (ctx.parentsOf.get(partnerId!) ?? []) : [];
  const partnerParentFan = hasPartner
    ? layoutCoupleFan(
        partnerParents.filter((id) => ctx.visibleIds.has(id) && !ctx.visited.has(id)),
        ctx,
      )
    : null;

  // rootId's (and their partner's, if any) children become this subtree's
  // own descendant row, one generation down — each child who is themself
  // partnered becomes the root of ITS OWN nested unit (own ancestor fan
  // for whoever they married in, own descendants), recursively.
  //
  // Deliberately NOT a static "compute the full list up front, then .map()
  // over it": a child's own layoutUnit call can itself discover (and mark
  // visited) further children in THIS SAME list as ITS OWN siblings (see
  // layoutUnit's sibling-collection — a full sibling group only gets
  // assigned to whichever one of them layoutUnit visits FIRST, since it
  // scans children-of-shared-parent freely). A pre-computed list, filtered
  // for "not yet visited" only ONCE before any recursive call ran, would
  // still contain those already-claimed siblings by id — and since
  // .map() doesn't re-check `visited` between iterations, they'd get
  // laid out a SECOND time via their own separate layoutUnit call (this
  // was a real bug, caught by tests: galinaSib2/galinaSib3 each appeared
  // twice in a lopsided-siblings scenario, laid out once as galinaSib1's
  // own siblings and again via this loop's own next iterations). Checking
  // `ctx.visited` fresh on every iteration is what avoids that.
  const childIds = [...new Set(ctx.childrenOf.get(rootId) ?? [])].filter((id) => ctx.visibleIds.has(id));
  const childUnits: { width: number; slots: UnitSlot[] }[] = [];
  for (const childId of childIds) {
    if (ctx.visited.has(childId)) continue; // claimed as an earlier sibling's own sibling — already laid out
    // A child's own partner is handled INSIDE layoutUnit's own hasPartner
    // branch (just like rootId's partner above) — layoutUnit always owns
    // its own root's partner, so children are never pre-paired here.
    childUnits.push(layoutUnit(childId, CHILD_SIDE, ctx));
  }

  // Every piece of this subtree is placed incrementally into `slots`/
  // `extent`, each new piece checked against everything already placed so
  // far (via resolveCollision) — this is what actually prevents collisions
  // that a pure per-branch WIDTH calculation misses: a child's own spouse's
  // ancestor fan can reach back up into a generation this same subtree
  // already occupies (e.g. rootId's own generation, or rootId's parents'),
  // which a width-only check has no way to see (see file header comment
  // and git history for the exact bug this fixes).
  const slots: UnitSlot[] = [{ id: rootId, relativeX: 0, relativeGeneration: 0 }];
  const extent: ExtentByGeneration = computeExtentByGeneration(slots);

  /** Places `pieceSlots` (already in ITS OWN local relative coordinates) at `desiredX`/`generationDelta`, nudged further in `direction` only as much as needed to clear whatever's already in `slots`/`extent`. Updates `slots`/`extent` and returns the actual x used. */
  function placePiece(pieceSlots: UnitSlot[], desiredX: number, generationDelta: number, direction: 1 | -1): number {
    const pieceExtent = computeExtentByGeneration(
      pieceSlots.map((s) => ({ ...s, relativeGeneration: s.relativeGeneration + generationDelta })),
    );
    const push = resolveCollision(extent, pieceExtent, desiredX, direction);
    const actualX = desiredX + direction * push;
    for (const slot of pieceSlots) {
      slots.push({ ...slot, relativeX: slot.relativeX + actualX, relativeGeneration: slot.relativeGeneration + generationDelta });
    }
    // mergeExtent needs the TOTAL shift from the piece's own local zero to
    // where it actually landed (actualX) — NOT actualX - desiredX (the
    // extra push beyond what was merely requested), which was a real bug:
    // it under-recorded every piece's occupied range by `desiredX`,
    // meaning anything placed exactly at its first-requested position
    // (push=0, e.g. a partner placed with no prior collision) got merged
    // into `extent` as if it were still at the piece's own local 0 — so a
    // LATER piece's collision check against it used the wrong (unshifted)
    // position and could walk straight through where it actually sits
    // (the exact bug this fixes: a child's spouse's own parents ending up
    // on top of the focus's own partner, because the partner's true
    // position was never correctly recorded).
    mergeExtent(extent, pieceExtent, actualX);
    return actualX;
  }

  // rootId's own partner (and the partner's own further-nested ancestor
  // fan) claims partnerSide — a fixed local direction (see partnerSide's
  // own doc above), not necessarily the same as `outward`. Siblings must
  // NOT also try to use that same direction (they used to, keyed only to
  // `outward`, which collided with the partner whenever partnerSide
  // disagreed with outward) — they claim the OPPOSITE side instead, since
  // that's the only side not already spoken for once a partner exists.
  // With no partner, there's nothing to avoid, so siblings default to the
  // outward side (matches an unpartnered branch's own ancestor fan, which
  // still grows outward from rootId) — partnerSide itself already equals
  // outward in the no-partner case (see its own fallback), so this reads
  // uniformly either way.
  const siblingDirection = hasPartner ? ((-partnerSide) as 1 | -1) : partnerSide;

  // First sibling sits a full UNIT_X_SPACING away from rootId — not
  // PARTNER_X_SPACING — precisely so the couple (rootId + partner, only
  // PARTNER_X_SPACING apart) reads as its own separated family cell instead
  // of a sibling looking exactly as "close" to rootId as rootId's own
  // spouse. Further siblings beyond the first are still just
  // UNIT_X_SPACING apart from each other (a plain row, no couples between
  // them to separate).
  siblingIds.forEach((id, index) => {
    const desiredX = siblingDirection * (index + 1) * UNIT_X_SPACING;
    placePiece([{ id, relativeX: 0, relativeGeneration: 0 }], desiredX, 0, siblingDirection);
  });
  const siblingRowWidth = siblingIds.length * UNIT_X_SPACING;

  // Partner sits PARTNER_X_SPACING toward partnerSide from rootId — the
  // couple's own tight, dedicated gap (see PARTNER_X_SPACING's doc). The
  // partner's own ancestor fan (partnerParentFan, already positioned in
  // ITS OWN local frame with the partner at relativeX 0 / relativeGeneration
  // 0) rides along as part of the same piece. The partner's own siblings
  // extend further toward partnerSide, past the partner — starting a full
  // UNIT_X_SPACING beyond the partner's own position (same reasoning as
  // rootId's siblings above: separates the couple from the partner's own
  // sibling, not just from rootId's).
  let partnerX = 0;
  if (hasPartner) {
    const partnerPieceSlots: UnitSlot[] = [
      { id: partnerId!, relativeX: 0, relativeGeneration: 0 },
      ...(partnerParentFan?.slots.filter((s) => !(s.relativeGeneration === 0 && s.id === partnerId)) ?? []),
      ...partnerSiblingIds.map((id, index) => ({
        id,
        relativeX: partnerSide * (index + 1) * UNIT_X_SPACING,
        relativeGeneration: 0,
      })),
    ];
    partnerX = placePiece(partnerPieceSlots, partnerSide * PARTNER_X_SPACING, 0, partnerSide);
  }

  // rootId's OWN parent generation sits centered over rootId's OWN row
  // block (rootId + siblings, on the sibling side): if rootId has siblings
  // extending in siblingDirection, the couple above them should still read
  // as "above this whole row", not hug rootId's single card while the
  // siblings poke out unconnected-looking — so its own center shifts by
  // half of siblingRowWidth, in siblingDirection. Rides along as one piece
  // (parentFan, already positioned in ITS OWN local frame — see
  // layoutCoupleFan), placed as a whole against whatever's already there
  // (siblings, partner + partner's fan).
  if (parentFan) {
    const parentRowCenter = siblingDirection * (siblingRowWidth / 2);
    // Direction must be siblingDirection (away from the partner side), not
    // an arbitrary pick: the partner's own parent fan (partnerParentFan)
    // was already placed above, at generation -1, on partnerSide — if
    // rootId's own parents collide with it (the common case: BOTH sides
    // of a couple have their own two parents visible, so both fans land
    // near generation -1 at once), they must be pushed AWAY from the
    // partner's side, not toward it (pushing toward it would shove
    // rootId's own parents on top of where the partner's parents are
    // headed, the exact bug this fixes).
    placePiece(parentFan.slots, parentRowCenter, 0, siblingDirection);
  }

  // Children sit one generation down, centered under rootId+partner's own
  // row (NOT under the ancestor fan above — descendants of a couple are
  // "below the couple", regardless of how wide either spouse's own
  // ancestor line fans out). Each child unit is placed one at a time,
  // left-to-right alternating outward from center, checked against
  // EVERYTHING placed so far (siblings, partner+fan, parent+fan, and any
  // earlier children already placed) — this is what catches a child's own
  // spouse's ancestor fan reaching back into an already-occupied
  // generation (the exact bug this whole incremental-placement approach
  // exists for).
  const coupleRowCenter = hasPartner ? partnerX / 2 : 0;
  layoutChildrenRow(placePiece, childUnits, coupleRowCenter);

  const width = Math.max(0, ...slots.map((s) => Math.abs(s.relativeX)));

  return { width, slots, extentByGeneration: extent };
}

/**
 * Lays out a couple's own further ancestor fan (used for BOTH "rootId's own
 * parents" and "rootId's partner's own parents" in layoutUnit — the exact
 * same logic applies to either) as ONE combined piece, already positioned
 * in its own local frame: when leftId/rightId are partners of each other,
 * leftId sits at relativeX -PARTNER_X_SPACING/2 and rightId at
 * +PARTNER_X_SPACING/2 (the couple's own tight gap, same as any other
 * partnership); when they're NOT partners (see CRITICAL note below), each
 * sits at half of UNIT_X_SPACING instead — two recorded parents who aren't
 * married to each other are just two unrelated people, not a family cell to
 * visually group together. Both cases: relativeGeneration -1, each with
 * their own further-nested fan folded in at the matching offset.
 *
 * CRITICAL: when leftId/rightId ARE partners of each other (the common
 * case — two recorded parents who were married), this calls layoutUnit
 * EXACTLY ONCE, for leftId only — layoutUnit's own hasPartner handling
 * already places rightId as leftId's partner internally (with rightId's
 * own further ancestor fan nested correctly, per layoutUnit's own partner
 * handling). Calling layoutUnit a SECOND time for rightId here as well
 * would lay rightId (and everyone above them) out AGAIN, duplicated — this
 * was a real bug caught by tests (see git history: motherB/fatherB each
 * appeared twice in a Виктор+Галина scenario). layoutUnit is only called
 * twice, independently, when leftId/rightId are NOT partners of each other
 * (two recorded parents who happen not to be married to each other) —
 * there's no shared internal placement to double up on in that case.
 */
function layoutCoupleFan(
  parentIds: string[],
  ctx: LayoutContext,
): { slots: UnitSlot[] } | null {
  const { leftId, rightId, arePartners } = orderCoupleBySlot(parentIds, ctx.partnerOf, ctx.genderOf);
  if (!leftId && !rightId) return null;

  const slots: UnitSlot[] = [];

  if (leftId && rightId && arePartners) {
    // One layoutUnit call covers both — rightId is leftId's own partner,
    // placed internally at leftId's own outward side (side="left" here
    // means outward=-1, so the partner lands on leftId's outward/left
    // side too — see layoutUnit's own partner-placement, which always
    // puts the partner on `outward`, matching the couple's own established
    // left/right order since orderCoupleBySlot already put leftId on the
    // male/left slot when genders are known).
    const leftUnit = layoutUnit(leftId, "left", ctx);
    const leftX = -PARTNER_X_SPACING / 2;
    for (const slot of leftUnit.slots) {
      slots.push({ ...slot, relativeX: slot.relativeX + leftX, relativeGeneration: slot.relativeGeneration - 1 });
    }
    return { slots };
  }

  if (leftId) {
    const leftUnit = layoutUnit(leftId, "left", ctx);
    const leftX = -UNIT_X_SPACING / 2;
    for (const slot of leftUnit.slots) {
      slots.push({ ...slot, relativeX: slot.relativeX + leftX, relativeGeneration: slot.relativeGeneration - 1 });
    }
  }
  if (rightId) {
    const rightUnit = layoutUnit(rightId, "right", ctx);
    const rightX = UNIT_X_SPACING / 2;
    for (const slot of rightUnit.slots) {
      slots.push({ ...slot, relativeX: slot.relativeX + rightX, relativeGeneration: slot.relativeGeneration - 1 });
    }
  }

  return { slots };
}

/**
 * Places every child unit in a row, one generation down from `center`,
 * alternating outward from center (first child closest to center, then
 * alternating left/right) so the row reads as centered even if children
 * are added one at a time — each child unit checked via `placePiece`
 * against everything already placed in the whole subtree so far (not just
 * other children), which is what catches a child's own spouse's ancestor
 * fan reaching back into an already-occupied generation several levels up.
 */
function layoutChildrenRow(
  placePiece: (pieceSlots: UnitSlot[], desiredX: number, generationDelta: number, direction: 1 | -1) => number,
  childUnits: { width: number; slots: UnitSlot[] }[],
  center: number,
): void {
  // Alternate: 1st child at center, 2nd to its right, 3rd to its left, 4th
  // further right, etc. — keeps the row visually balanced around `center`
  // regardless of how many children there are, same intent the old
  // symmetric-reservation version had, just built incrementally instead of
  // pre-computed (pre-computing would need the same per-generation extent
  // math this function's caller already does, for no added benefit).
  let rightCursor = center;
  let leftCursor = center;
  childUnits.forEach((unit, index) => {
    const placeOnRight = index % 2 === 0;
    if (placeOnRight) {
      const desiredX = index === 0 ? center : rightCursor + UNIT_X_SPACING + unit.width;
      const actualX = placePiece(unit.slots, desiredX, 1, 1);
      rightCursor = actualX + unit.width;
    } else {
      const desiredX = leftCursor - UNIT_X_SPACING - unit.width;
      const actualX = placePiece(unit.slots, desiredX, 1, -1);
      leftCursor = actualX - unit.width;
    }
  });
}

/**
 * The `side` passed to a child's own layoutUnit call — always "right".
 * There's no couple-relative meaning for "left/right" once we've moved to
 * a DIFFERENT generation (down, not up): a child's own partner still ends
 * up on the correct gender-based side of THEM regardless of this value
 * (see layoutUnit's partnerSide, computed independently of `side`), and
 * layoutChildrenRow's own centering (not `side`) is what actually
 * positions children left-to-right relative to each other — so a fixed
 * "right" here never causes a visible left/right bias, it only affects
 * (arbitrarily, harmlessly) which way THAT child's own nested-further
 * fans tie-break when gender is unknown.
 */
const CHILD_SIDE = "right";
