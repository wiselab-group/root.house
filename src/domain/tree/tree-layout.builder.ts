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
  // A person can have multiple recorded partnerships (divorce+remarriage,
  // several partners, etc — relationships_partnership deliberately has no
  // unique(person1Id, person2Id) constraint, see docs/architecture.md) —
  // Map<string, string[]>, built in the stable order partnershipEdges
  // itself arrives in (DB row order), not a single Map<string, string>
  // (which would silently let the last edge overwrite every earlier one,
  // dropping all but one partner from the visible tree). layoutUnit below
  // treats partnersOf.get(rootId)[0] as rootId's "primary" partner (same
  // placement rule as before) and any further entries as additional
  // partnerships laid out as their own couple units — see layoutUnit's own
  // doc for how those are placed.
  //
  // "Primary" must be the CURRENT marriage (isCurrent: true), not merely
  // whichever partnership row happens to have been inserted into the DB
  // first — a person's ex-wife recorded before their current wife must
  // never outrank her for the tight PARTNER_X_SPACING adjacency slot ("та,
  // на которой женат, должна быть рядом" — the current spouse sits right
  // beside them; any ex-partner is laid out further out as an additional
  // partnership, see the extraPartnerIds loop below). Entries are sorted
  // current-first, stable otherwise (Array.prototype.sort is a stable sort
  // in a spec-compliant engine, so DB row order is preserved among
  // multiple exes, or when isCurrent is tied/false for all — e.g. no
  // partnership is marked current at all, a normal case for historical-
  // only records).
  const partnersOf = new Map<string, string[]>();
  const isCurrentOf = new Map<string, boolean>();
  for (const { person1Id, person2Id, isCurrent } of input.partnershipEdges) {
    if (!partnersOf.has(person1Id)) partnersOf.set(person1Id, []);
    if (!partnersOf.has(person2Id)) partnersOf.set(person2Id, []);
    partnersOf.get(person1Id)!.push(person2Id);
    partnersOf.get(person2Id)!.push(person1Id);
    // Same pair can only be marked current from one direction's perspective
    // in this lookup (isCurrentOf keys on the OTHER partner's id relative
    // to a given rootId) — safe to just OR any existing value in, since a
    // given (rootId, partnerId) pair's isCurrent is the same edge either
    // way partnershipEdges recorded it.
    isCurrentOf.set(
      `${person1Id}|${person2Id}`,
      isCurrent || (isCurrentOf.get(`${person1Id}|${person2Id}`) ?? false),
    );
    isCurrentOf.set(
      `${person2Id}|${person1Id}`,
      isCurrent || (isCurrentOf.get(`${person2Id}|${person1Id}`) ?? false),
    );
  }
  for (const [personId, ids] of partnersOf) {
    ids.sort((a, b) => {
      const aCurrent = isCurrentOf.get(`${personId}|${a}`) ?? false;
      const bCurrent = isCurrentOf.get(`${personId}|${b}`) ?? false;
      if (aCurrent === bCurrent) return 0; // stable sort keeps DB row order
      return aCurrent ? -1 : 1;
    });
  }
  const genderOf = new Map<string, Gender>(
    persons.map((p) => [p.id, p.gender]),
  );

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
        if (
          !ancestorDepthOf.has(parentId) ||
          ancestorDepthOf.get(parentId)! > depth + 1
        ) {
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
        if (
          !descendantDepthOf.has(childId) ||
          descendantDepthOf.get(childId)! > depth + 1
        ) {
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
            if (
              !ancestorDepthOf.has(siblingId) ||
              ancestorDepthOf.get(siblingId)! > siblingBudget
            ) {
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
        if (mergeBudget(descendantDepthOf, person1Id, person2Id))
          addedAny = true;
      }
    }
  }

  const visibleIds = new Set(generationOf.keys());
  const visited = new Set<string>();
  const ctx: LayoutContext = {
    visibleIds,
    parentsOf,
    childrenOf,
    partnersOf,
    genderOf,
    visited,
  };

  // layoutUnit already handles its OWN root's partner internally (their own
  // ancestor fan, nested exactly like any other couple in the tree — see
  // its doc) — the focus person is laid out exactly the same way any other
  // person in the tree is, no separate top-level "couple" special-casing
  // needed. `side` only matters for tie-breaking which way things the focus
  // person's OWN further-nested units grow; "right" is an arbitrary but
  // stable choice (their own partner still gets rootId's outward side,
  // "right" here, per layoutUnit's own partner-placement rule).
  const focusUnit = layoutUnit(
    focusPersonId,
    "right",
    ctx,
    undefined,
    undefined,
    true,
  );

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
  partnersOf: Map<string, string[]>,
  genderOf: Map<string, Gender>,
): OrderedCouple {
  if (ids.length === 0)
    return { leftId: null, rightId: null, arePartners: false };
  if (ids.length === 1)
    return { leftId: ids[0], rightId: null, arePartners: false };

  const [a, b] = ids;
  const arePartners = (partnersOf.get(a) ?? []).includes(b);
  if (!arePartners) {
    const [leftId, rightId] = [...ids].sort();
    return { leftId, rightId, arePartners: false };
  }
  const genderA = genderOf.get(a) ?? "unknown";
  const genderB = genderOf.get(b) ?? "unknown";
  if (genderA === "male" && genderB === "female")
    return { leftId: a, rightId: b, arePartners: true };
  if (genderA === "female" && genderB === "male")
    return { leftId: b, rightId: a, arePartners: true };
  const [leftId, rightId] = [...ids].sort();
  return { leftId, rightId, arePartners: true };
}

interface LayoutContext {
  visibleIds: Set<string>;
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  partnersOf: Map<string, string[]>;
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
 * One independent lateral rider — a person (and everything nested under
 * them: their own partner, descendants, further ancestor fan) who rides
 * beside a core couple/ancestor-line WITHOUT being part of it — grouped
 * separately so `placePiece` can push each group only as far as IT
 * individually needs, instead of one shared push for every lateral rider
 * at once. Without this grouping, an unrelated lateral group needing a
 * huge push (e.g. one ancestor's own many siblings, each with a large
 * family) would drag every OTHER lateral group along with it too — even
 * ones (e.g. a single unpartnered sibling) that never collided with
 * anything on their own (see placePiece's own doc on `lateralGroups` for
 * the full explanation and the real bug this fixes).
 */
interface LateralGroup {
  slots: UnitSlot[];
  /**
   * The direction this group's own EXTRA collision push (beyond whatever
   * offset is already baked into its slots' own `relativeX`) should go,
   * relative to rootId — read by `placePiece` ONLY when its own
   * `allowDirectionOverride` is true (see that param's own doc). Left
   * undefined for groups that never need their own override (a couple's
   * shared children row, for instance — always fine following the whole
   * piece's own `direction`).
   *
   * Stamped at the exact point where each group is first produced, using
   * THAT site's own unambiguous local axis — layoutUnit's own sibling loop
   * stamps `siblingDirection` for rootId's own siblings, placePartner
   * stamps `side` for thisPartnerId's own siblings and (overwriting any
   * deeper stamp) thisPartnerId's own parentFan lateral riders. A group
   * bubbling up through multiple nested calls gets RE-stamped at each site
   * that bubbles it further (never left as a stale stamp from several
   * levels down) — a stamp from a couple several generations up has no
   * valid meaning once reinterpreted against a different, unrelated axis
   * (the exact reported bug: Елена Ушкар's group, correctly stamped
   * relative to her own parents' local axis, still tried to push on that
   * stamped side even once the whole fan carrying her became part of an
   * unrelated outer piece pushed in the opposite direction — sending her
   * across zero into the wrong spouse's territory).
   */
  direction?: 1 | -1;
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
      extent.set(slot.relativeGeneration, {
        min: slot.relativeX,
        max: slot.relativeX,
      });
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
    const incomingMin =
      incoming.min + desiredOffset + (direction === 1 ? extraPush : -extraPush);
    const incomingMax =
      incoming.max + desiredOffset + (direction === 1 ? extraPush : -extraPush);
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

function mergeExtent(
  target: ExtentByGeneration,
  incoming: ExtentByGeneration,
  offset: number,
): void {
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
 * The OTHER recorded parent of childId, given one of their parents
 * (thisParentId) — used to attribute a child to the specific couple they
 * were recorded under when rootId has multiple partnerships (see
 * childUnitsFor in layoutUnit). Returns undefined when childId has no
 * second recorded parent at all (an unpartnered/unknown-other-parent
 * case), which callers treat as "belongs with the primary partner's row"
 * to preserve existing single-parent-recorded behavior unchanged.
 */
function otherParentOf(
  childId: string,
  thisParentId: string,
  ctx: LayoutContext,
): string | undefined {
  return ctx.parentsOf.get(childId)?.find((p) => p !== thisParentId);
}

/**
 * Finds personId's own siblings (same recorded parents, still visible, not
 * already claimed by someone else's own layoutUnit call) and marks them
 * visited. Shared between rootId and rootId's own partner in layoutUnit
 * (see COUPLE SYMMETRY note there) — a partner is a full person with their
 * own sibling group too, not just an inline placeholder, so this must run
 * for them exactly the same way it runs for rootId.
 *
 * HALF-SIBLINGS FROM A DIFFERENT PARTNERSHIP are deliberately EXCLUDED here
 * when that other partnership is itself visible: a candidate childId who
 * shares parentId with personId but has a DIFFERENT, visible other-parent
 * is a child of parentId's OTHER couple (see childUnitsFor/placePartner in
 * layoutUnit), not a plain sibling riding beside personId — they get their
 * own position centered under THEIR OWN parents' pairing instead. Without
 * this check, collectSiblings(child1) would pull in child2 (root's OTHER
 * partner's child) as if they were a shared full/half sibling, mark them
 * visited here, and silently steal them from partnerB's own children row
 * before placePartner ever got to lay it out (the exact bug this guards
 * against). A candidate is still a normal (half-)sibling when their other
 * recorded parent MATCHES personId's own other parent for this shared
 * parentId (full siblings), or when EITHER side has no second recorded
 * parent at all (the existing single-parent-recorded case, unaffected).
 */
function collectSiblings(personId: string, ctx: LayoutContext): string[] {
  const parents = ctx.parentsOf.get(personId) ?? [];
  const siblingIds: string[] = [];
  for (const parentId of parents) {
    const personOtherParent = otherParentOf(personId, parentId, ctx);
    for (const childId of ctx.childrenOf.get(parentId) ?? []) {
      if (
        childId === personId ||
        !ctx.visibleIds.has(childId) ||
        ctx.visited.has(childId) ||
        siblingIds.includes(childId)
      ) {
        continue;
      }
      const childOtherParent = otherParentOf(childId, parentId, ctx);
      const belongsToADifferentVisibleCouple =
        childOtherParent !== undefined &&
        personOtherParent !== undefined &&
        childOtherParent !== personOtherParent &&
        ctx.visibleIds.has(childOtherParent);
      if (belongsToADifferentVisibleCouple) continue;
      siblingIds.push(childId);
      ctx.visited.add(childId);
    }
  }
  return siblingIds;
}

function layoutUnit(
  rootId: string,
  side: "left" | "right",
  ctx: LayoutContext,
  /**
   * A SOFT preference for which side rootId's OWN partner sits on, used
   * only as an unknown-gender tie-breaker — used when layoutUnit is called
   * for a sibling that's already been placed outward of some other unit
   * (see the two collectSiblings-driven call sites below, both of which
   * pass `siblingDirection`/`side` here).
   *
   * NEVER overrides a KNOWN gender order — "муж слева, жена справа" is the
   * higher-priority invariant (confirmed against real data: an earlier
   * version let this param win unconditionally, which silently swapped
   * husband/wife for EVERY married sibling whose row happened to grow
   * toward the side gender disagreed with — e.g. Вера Артюх's husband
   * Владимир landing to HER right just because her sisters' row grows
   * rightward). When gender is known, partnerSide is decided by gender
   * ALONE, and this param is ignored entirely for that decision.
   *
   * The DIFFERENT problem this param used to also try to solve — a
   * sibling's own partner folding back toward whoever placed the sibling
   * instead of extending past them (the reported Николай Ушкар/Елена bug)
   * — doesn't actually need partnerSide's help: `width` already reflects
   * both sides of rootId's own local 0 (see the width computation at the
   * end of this function), so `placePiece`'s own collision resolution
   * already keeps a "flipped" couple block (partner on the inward side)
   * from overlapping whatever's already placed on that inward side — no
   * special-casing needed here for that. See `pinPartnerSide` below for
   * the ONE case that genuinely does need to override gender: two
   * unrelated recorded parents (not partnered with each other) each
   * remarried — see `layoutCoupleFan`'s own doc for why THAT case must
   * pin a side even against gender, to avoid crossing two unrelated family
   * lines.
   */
  forcePartnerSide?: 1 | -1,
  /**
   * A HARD override for which side rootId's OWN partner sits on — wins
   * even over a KNOWN gender order. Used ONLY by `layoutCoupleFan`'s own
   * "not partners of each other" branch (two recorded parents who were
   * never married to each other, each separately remarried) — there,
   * rootId's own new partner is a completely unrelated person with no
   * guaranteed left/right relationship to the OTHER recorded parent's own
   * side of the fan; gender-based placement alone would happily send
   * rootId's new (opposite-gender) partner toward the OTHER parent's side,
   * crossing the two family lines (the exact bug this fixes: dad's new
   * wife, placed by pure gender order, drifting right past 0 into mom's
   * own territory — see `layoutCoupleFan`'s own doc for the full
   * reasoning). Keeping two unrelated ancestor lines from crossing is a
   * higher-priority invariant here than gender order within THIS
   * particular new pairing, unlike the sibling case above (where there is
   * no second family line to protect — just one row growing one way).
   * Left undefined everywhere else, so `forcePartnerSide`'s own
   * unknown-gender-only tie-break (or plain gender) decides instead.
   */
  pinPartnerSide?: 1 | -1,
  /**
   * True ONLY for the single outermost `layoutUnit` call — the focus
   * person, called directly from `buildFocusTreeLayout` — whose own
   * `slots`/`lateralGroups` are the FINAL output, never folded into a
   * bigger piece by anything further out. Every other call (recursive
   * self-calls for siblings/children, and `layoutCoupleFan`'s own
   * `layoutUnit(leftId, ...)` for an ancestor couple) leaves this `false`
   * (the default).
   *
   * Only controls whether THIS call's own `parentFan` placement (below) is
   * allowed to READ each lateral group's stamped `direction` (see
   * LateralGroup's own doc, and layoutCoupleFan's `arePartners` branch,
   * which stamps a `direction` on EVERY couple's own combined sibling
   * groups, at every nesting depth — the stamp itself is always correct
   * relative to ITS OWN couple's local axis). At any NESTED level, this
   * whole parentFan piece (core AND every stamped lateral group alike)
   * still has to move together as ONE rigid block once ITS OWN containing
   * piece gets pushed by a DIFFERENT outer `direction` a level further up
   * (e.g. Виктор's own parentFan, still nested inside the outer
   * Виктор+Галина couple fan) — reading the stamp there instead of the
   * call's own `direction` corrupts it (the exact reported bug: Елена
   * Ушкар's group, correctly stamped relative to Николай Купчик's own
   * local axis, still tried to push on its stamped side even once the
   * whole fan became Виктор's own parentFan and got pushed as a block in
   * the OPPOSITE direction, sending her across zero into Галина's
   * territory). Only the ONE level whose own result is never re-wrapped —
   * the true top-level parentFan — can safely let each spouse's own
   * sibling group extend its own separate way.
   */
  isTopLevel = false,
): {
  width: number;
  slots: UnitSlot[];
  coreSlots: UnitSlot[];
  lateralGroups: LateralGroup[];
  extentByGeneration: ExtentByGeneration;
} {
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
  //
  // MULTIPLE PARTNERSHIPS: rootId can have more than one recorded partner
  // (divorce+remarriage, several partnerships — see partnersOf's own doc).
  // allPartnerIds[0] is rootId's "primary" partner and keeps every existing
  // placement rule unchanged (gender-based side, PARTNER_X_SPACING
  // adjacency, etc — see partnerSide below); allPartnerIds.slice(1) are
  // additional partners, each laid out as their OWN couple unit further
  // out on siblingDirection (the side NOT already claimed by the primary
  // partner), in the same stable order partnersOf itself preserves (DB row
  // order) — see the loop below for how each of those pairs (and their own
  // shared children) gets its own position.
  const allPartnerIds = (ctx.partnersOf.get(rootId) ?? []).filter(
    (id) => ctx.visibleIds.has(id) && !ctx.visited.has(id),
  );
  const partnerId = allPartnerIds[0];
  const hasPartner = partnerId != null;
  if (hasPartner) ctx.visited.add(partnerId);
  const extraPartnerIds = allPartnerIds.slice(1);

  // rootId's siblings (same parents, still visible, not already placed by
  // an outer call) ride beside them in this same row, extending outward.
  // Each partner's OWN siblings are collected later, inside placePartner
  // (called once per partnership below) — not here — since collectSiblings
  // has the side effect of marking siblings visited, and doing it twice for
  // the same partner (once here, once inside placePartner) would silently
  // find nothing the second time.
  const siblingIds = collectSiblings(rootId, ctx);

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
  // flipped back toward the couple above).
  //
  // `pinPartnerSide` (hard override — two unrelated remarriages that must
  // never cross, see its own doc) wins even over a KNOWN gender order.
  // Otherwise, gender ALWAYS decides partnerSide when known —
  // `forcePartnerSide` (soft) is consulted only as an unknown-gender
  // tie-breaker, never as an override of a known gender order. An earlier
  // version let the sibling-loop's soft preference win unconditionally
  // (meant only to keep a sibling's own couple from folding back toward
  // whatever placed the sibling — see forcePartnerSide's own doc) — that
  // silently swapped husband/wife for EVERY married sibling whose row
  // happened to grow toward the side gender disagreed with (the confirmed
  // real-data bug: Вера Артюх's husband Владимир landing to HER right
  // because her sisters' row grows rightward, even though gender says a
  // husband belongs on his wife's left). "муж слева, жена справа" is the
  // higher-priority invariant for THAT case — keeping the whole couple
  // block from folding back toward rootId's row doesn't actually need
  // partnerSide's help at all (see forcePartnerSide's own doc: `width`
  // already covers both sides of local 0, so collision resolution alone
  // keeps a flipped block clear of whatever's inward of it).
  const partnerSide: 1 | -1 = hasPartner
    ? (pinPartnerSide ??
      (() => {
        const rootGender = ctx.genderOf.get(rootId) ?? "unknown";
        const partnerGender = ctx.genderOf.get(partnerId!) ?? "unknown";
        if (rootGender === "male" && partnerGender === "female") return 1;
        if (rootGender === "female" && partnerGender === "male") return -1;
        return forcePartnerSide ?? (outward as 1 | -1);
      })())
    : (outward as 1 | -1);

  // rootId's (and their partner's, if any) children become this subtree's
  // own descendant row, one generation down — each child who is themself
  // partnered becomes the root of ITS OWN nested unit (own ancestor fan
  // for whoever they married in, own descendants), recursively.
  //
  // With MULTIPLE partnerships, each child is attributed to the ONE couple
  // they were actually recorded under — a child with no second recorded
  // parent still defaults to the PRIMARY partner's row (preserves every
  // existing single-partner/single-recorded-parent test unchanged); a
  // child whose other recorded parent is a DIFFERENT, visible partner is
  // laid out under THAT partner's own row instead (see the per-partner
  // loop below), never duplicated into both.
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
  function childUnitsFor(thisPartnerId: string | undefined): {
    width: number;
    slots: UnitSlot[];
    coreSlots: UnitSlot[];
    lateralGroups: LateralGroup[];
  }[] {
    const ids = [...new Set(ctx.childrenOf.get(rootId) ?? [])].filter((id) => {
      if (!ctx.visibleIds.has(id)) return false;
      const other = otherParentOf(id, rootId, ctx);
      return other === undefined || other === thisPartnerId;
    });
    const units: {
      width: number;
      slots: UnitSlot[];
      coreSlots: UnitSlot[];
      lateralGroups: LateralGroup[];
    }[] = [];
    for (const childId of ids) {
      if (ctx.visited.has(childId)) continue; // claimed as an earlier sibling's own sibling — already laid out
      // A child's own partner is handled INSIDE layoutUnit's own hasPartner
      // branch (just like rootId's partner above) — layoutUnit always owns
      // its own root's partner, so children are never pre-paired here.
      units.push(layoutUnit(childId, CHILD_SIDE, ctx));
    }
    return units;
  }
  const childUnits = childUnitsFor(partnerId);

  // Every piece of this subtree is placed incrementally into `slots`/
  // `extent`, each new piece checked against everything already placed so
  // far (via resolveCollision) — this is what actually prevents collisions
  // that a pure per-branch WIDTH calculation misses: a child's own spouse's
  // ancestor fan can reach back up into a generation this same subtree
  // already occupies (e.g. rootId's own generation, or rootId's parents'),
  // which a width-only check has no way to see (see file header comment
  // and git history for the exact bug this fixes).
  const slots: UnitSlot[] = [
    { id: rootId, relativeX: 0, relativeGeneration: 0 },
  ];
  const extent: ExtentByGeneration = computeExtentByGeneration(slots);
  // The "anchor" subset of `slots` — rootId, their primary partner, and
  // both sides' DIRECT ancestor fans — that this unit's OWN caller should
  // use to decide how far to push the WHOLE unit on collision (see
  // placePiece's own doc on corePieceSlots). Lateral riders (siblingIds,
  // extraPartnerIds, and a partner's own siblings, all handled below)
  // deliberately never get added here — they can extend arbitrarily far
  // without dragging rootId/partner along with them.
  const coreSlots: UnitSlot[] = [
    { id: rootId, relativeX: 0, relativeGeneration: 0 },
  ];
  // Every lateral rider this unit places (rootId's own siblings, extra
  // partners, a partner's own siblings, and rootId's own parentFan's
  // lateral groups bubbled up) — kept as INDEPENDENT groups (not flattened
  // into one list) so whoever places THIS layoutUnit result as a piece
  // (a sibling call, a child call, layoutCoupleFan) can give each group
  // its own push instead of dragging them all together (see placePiece's
  // own doc on lateralGroups for the bug this fixes).
  const lateralGroups: LateralGroup[] = [];

  /**
   * Places `pieceSlots` (already in ITS OWN local relative coordinates) at
   * `desiredX`/`generationDelta`, nudged further in `direction` only as
   * much as needed to clear whatever's already in `slots`/`extent`.
   * Updates `slots`/`extent` and returns the actual x used.
   *
   * `corePieceSlots` (defaults to `pieceSlots` itself) is the subset of
   * `pieceSlots` that ACTUALLY decides how far to push on collision — the
   * couple/ancestor-line "anchor" of the piece, as opposed to lateral
   * riders (a partner's own siblings and THEIR further descendants/
   * ancestor fans) who can extend arbitrarily far without dragging the
   * anchor along with them. Without this split, a piece containing a wide
   * lateral tail (e.g. Галина's 9 siblings, each with their own family,
   * folded into her own layoutUnit result) would compute collision push
   * from the TAIL's own worst-case overlap and apply that SAME push to the
   * anchor too — so a couple that, on its own, wouldn't collide with
   * anything gets dragged thousands of pixels sideways just because some
   * lateral relative several branches over happens to share a generation
   * with something already placed (the third occurrence of this class of
   * bug: first fixed by reordering placePartner's own children-before-
   * siblings, then layoutUnit's own siblingIds-before-placePartner, and
   * now via this piece-splitting mechanism for the one remaining path —
   * layoutCoupleFan's single combined layoutUnit call for an ancestor
   * couple, which has no "before/after" ordering to reshuffle since the
   * entire fan is necessarily built as one nested recursive call). The
   * full `pieceSlots` (anchor + every lateral rider) is still what gets
   * merged into `extent` below — lateral riders must still be accounted
   * for so LATER pieces don't collide with them; they just don't get a
   * vote in how much THIS piece itself gets pushed.
   *
   * `lateralGroups` (defaults to none) further breaks `corePieceSlots`'s
   * complement into INDEPENDENT groups (e.g. one group per sibling, each
   * carrying their own descendants/further ancestor fan) — each gets its
   * OWN push, computed sequentially against a running extent that
   * accumulates the core AND every earlier-processed group, instead of
   * one shared push for every lateral rider at once. This is the fourth
   * occurrence of the anchor-drag bug class (see corePieceSlots' own doc
   * above for the first three): treating ALL lateral riders as a single
   * blob meant one group that genuinely needed a huge push (e.g. one
   * ancestor's own 9 siblings, each with a large family) dragged every
   * OTHER, unrelated group along with it too — even a lone unpartnered
   * sibling (Дарья Купчик in the reported case) who never collided with
   * anything on her own ended up thousands of pixels away, because she
   * happened to be flattened into the same `pieceSlots` array as someone
   * else's much wider lateral tail. Any slot in `pieceSlots` that is
   * neither in `corePieceSlots` nor in any `lateralGroups` entry is
   * treated as its own trivial one-slot group (this is what callers that
   * don't bother grouping single riders — a lone `thisPartnerParentFan`
   * slot filtered out, for instance — fall back to safely).
   */
  function placePiece(
    pieceSlots: UnitSlot[],
    desiredX: number,
    generationDelta: number,
    direction: 1 | -1,
    corePieceSlots: UnitSlot[] = pieceSlots,
    lateralGroups: LateralGroup[] = [],
    /**
     * Whether a lateral group's own stamped `direction` (see LateralGroup's
     * own doc) may override this call's own `direction` for that group's
     * push. `false` (the default) for every call EXCEPT the one placing
     * rootId's own `parentFan` when `isTopLevel` is true (see layoutUnit's
     * own doc on `isTopLevel`) — everywhere else, the whole piece (core AND
     * every lateral group alike) must move together as one rigid block in
     * THIS call's own `direction`, since a stamp from a couple several
     * levels down has no valid meaning once this piece itself gets folded
     * into a bigger one with a different axis (see isTopLevel's own doc for
     * the exact bug an unconditional override caused).
     */
    allowDirectionOverride = false,
  ): number {
    const isSplitPiece = corePieceSlots !== pieceSlots;
    const corePieceExtent = isSplitPiece
      ? computeExtentByGeneration(
          corePieceSlots.map((s) => ({
            ...s,
            relativeGeneration: s.relativeGeneration + generationDelta,
          })),
        )
      : computeExtentByGeneration(
          pieceSlots.map((s) => ({
            ...s,
            relativeGeneration: s.relativeGeneration + generationDelta,
          })),
        );
    const push = resolveCollision(extent, corePieceExtent, desiredX, direction);
    const actualX = desiredX + direction * push;

    // Deep-cloned running snapshot of `extent` — starts as `extent` +
    // corePieceExtent (at actualX), then accumulates each lateral group's
    // own final position as it's resolved below, so group N+1 correctly
    // sees group N's occupied space, not just what existed before this
    // whole piece (see this function's own doc on lateralGroups for why
    // sequential accumulation — not one shared push — is what actually
    // fixes the bug). Never assigned back to the real `extent`; the real
    // merge happens once, at the end, from the final per-slot positions.
    const runningExtent: ExtentByGeneration = new Map(
      [...extent].map(([generation, range]) => [generation, { ...range }]),
    );
    mergeExtent(runningExtent, corePieceExtent, actualX);

    const coreIds = new Set(corePieceSlots.map((s) => s.id));
    // Any pieceSlots not claimed by corePieceSlots or an explicit
    // lateralGroups entry become their own trivial one-slot groups — see
    // this function's own doc above.
    const groupedIds = new Set(
      lateralGroups.flatMap((g) => g.slots.map((s) => s.id)),
    );
    const ungroupedLateralSlots = pieceSlots.filter(
      (s) => !coreIds.has(s.id) && !groupedIds.has(s.id),
    );
    const allLateralGroups: LateralGroup[] = [
      ...lateralGroups,
      ...ungroupedLateralSlots.map((s) => ({ slots: [s] })),
    ];

    // slotOffsets accumulates each slot's own final relativeX shift (on
    // top of its already-recorded relativeX within pieceSlots) — core
    // slots get 0 (they stay exactly at actualX, per corePush above); each
    // lateral group gets its OWN independently-resolved push, in a
    // direction resolved from `group.direction` ONLY when this call passed
    // `allowDirectionOverride: true` (falling back to this call's own
    // `direction` otherwise, and whenever no stamp exists) — see this
    // param's own doc, and LateralGroup's own doc, for why the override
    // must stay off almost everywhere: a stamp is only ever meaningful
    // relative to the couple whose own local axis produced it, and every
    // group-producing site in this file (layoutUnit's own sibling loop,
    // placePartner's own sibling/parentFan bubbling) already re-stamps its
    // OWN bubbled-up groups with ITS OWN unambiguous local direction as
    // they pass through, so by the time a group reaches any `placePiece`
    // call, its stamp (if allowed to be read) already means exactly "which
    // way should this group's own EXTRA collision push go, relative to
    // rootId" — never anything from a deeper, unrelated axis.
    const slotOffsets = new Map<string, number>();
    for (const group of allLateralGroups) {
      if (group.slots.length === 0) continue;
      const groupExtent = computeExtentByGeneration(
        group.slots.map((s) => ({
          ...s,
          relativeGeneration: s.relativeGeneration + generationDelta,
        })),
      );
      const groupDirection: 1 | -1 =
        (allowDirectionOverride ? group.direction : undefined) ?? direction;
      const groupPush = resolveCollision(
        runningExtent,
        groupExtent,
        actualX,
        groupDirection,
      );
      for (const slot of group.slots) {
        slotOffsets.set(slot.id, groupDirection * groupPush);
      }
      mergeExtent(
        runningExtent,
        groupExtent,
        actualX + groupDirection * groupPush,
      );
    }

    for (const slot of pieceSlots) {
      const slotX = actualX + (slotOffsets.get(slot.id) ?? 0);
      slots.push({
        ...slot,
        relativeX: slot.relativeX + slotX,
        relativeGeneration: slot.relativeGeneration + generationDelta,
      });
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
    // position was never correctly recorded). Merges core slots at
    // actualX and each lateral group at its own (possibly further-nudged)
    // position, matching exactly what was just pushed into `slots` above
    // — reusing `runningExtent` (already correctly accumulated above)
    // instead of recomputing from scratch.
    for (const [generation, range] of runningExtent) {
      const existing = extent.get(generation);
      if (!existing) {
        extent.set(generation, { ...range });
      } else {
        existing.min = Math.min(existing.min, range.min);
        existing.max = Math.max(existing.max, range.max);
      }
    }
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
  const siblingDirection = hasPartner ? (-partnerSide as 1 | -1) : partnerSide;

  // Partner sits PARTNER_X_SPACING toward partnerSide from rootId — the
  // couple's own tight, dedicated gap (see PARTNER_X_SPACING's doc). The
  // partner's own ancestor fan (computed inside placePartner, positioned in
  // ITS OWN local frame with the partner at relativeX 0 / relativeGeneration
  // 0) rides along as part of the same piece. The partner's own siblings
  // extend further toward partnerSide, past the partner — starting a full
  // UNIT_X_SPACING beyond the partner's own position (same reasoning as
  // rootId's siblings above: separates the couple from the partner's own
  // sibling, not just from rootId's).
  //
  // Placed BEFORE rootId's own siblingIds below (see that block's own
  // doc for why) — rootId's own children (placed inside placePartner) must
  // claim their centered position in the shared collision extent before
  // ANY sibling's descendants (rootId's own siblings' kids, ordinary
  // cousins of rootId's children) get a chance to occupy the same
  // generation first and shove the real children row sideways to route
  // around them (a real bug: a partnered sibling's own descendants used to
  // land at the same generation as rootId's own children purely by
  // coincidence of tree depth, and — being placed first — forced those
  // children far off-center to avoid "colliding" with cousins they have no
  // actual positional relationship to).
  // Ids of every slot placed by placePartner(partnerId, ...) below (the
  // primary partner + their own full subtree: parent fan, siblings,
  // shared-children row) — captured so parentFan's own placement further
  // down can selectively widen JUST this block's gap from rootId on
  // collision, without also dragging rootId's own siblings/extra partners
  // (placed AFTER this block, also living in `slots` by the time parentFan
  // runs, but on siblingDirection — the opposite side — where they must
  // NOT move; see parentFan's own doc below for why a blanket "shift
  // everything but rootId" is wrong here).
  const partnerBlockIds = new Set<string>();
  if (hasPartner) {
    const slotsBeforePartner = slots.length;
    const { coreSlots: partnerCoreSlots, lateralGroups: partnerLateralGroups } =
      placePartner(partnerId!, partnerSide);
    for (const slot of slots.slice(slotsBeforePartner))
      partnerBlockIds.add(slot.id);
    // The primary partner (+ their own direct ancestor fan) is part of
    // THIS unit's own anchor — rootId + primary partner is the couple
    // callers of THIS layoutUnit result care about for their own collision
    // math (see coreSlots' own doc above). Extra partners and any
    // sibling's own partner are never folded in here — only the primary.
    coreSlots.push(...partnerCoreSlots);
    // The primary partner's own children/siblings (each already its own
    // independently-placed group, see placePartner's own doc) bubble up
    // as THIS unit's own lateral groups too, preserving their
    // independence at every level of recursion.
    lateralGroups.push(...partnerLateralGroups);
  }

  // First sibling sits a full UNIT_X_SPACING away from rootId — not
  // PARTNER_X_SPACING — precisely so the couple (rootId + partner, only
  // PARTNER_X_SPACING apart) reads as its own separated family cell instead
  // of a sibling looking exactly as "close" to rootId as rootId's own
  // spouse. Further siblings beyond the first are still just
  // UNIT_X_SPACING apart from each other (a plain row, no couples between
  // them to separate).
  //
  // Each sibling is laid out via its own layoutUnit call, not placed as a
  // bare slot — a sibling is a full person who can have their OWN partner
  // (and that partner's own descendants/further ancestor fan), same as
  // rootId itself. A bare `{ id, relativeX: 0 }` slot silently dropped a
  // sibling's own partner from the tree entirely (they were never marked
  // visited by anything, so hasPartner never ran for them and they simply
  // never got a LayoutNode) — this is the actual bug that omitted a
  // partnered sibling's spouse from the rendered tree. siblingUnit.width
  // (not a flat UNIT_X_SPACING) spaces consecutive siblings apart so a
  // sibling's own partner doesn't collide with the next sibling over —
  // placePiece's own collision resolution still pushes further if needed.
  // forcePartnerSide=siblingDirection: this sibling's own partner (if any)
  // must sit further in siblingDirection, past the sibling — never flipped
  // back toward rootId by pure gender order, which would land the partner
  // between rootId and the sibling instead of past both (see
  // forcePartnerSide's own doc on layoutUnit).
  let siblingCursor = 0;
  // The furthest a SIBLING PERSON THEMSELF (not their spouse's own
  // ancestor fan riding along) has landed — used below for
  // parentRowCenter instead of the full (spouse-inflated) siblingCursor,
  // so rootId's own parents center over where the sibling ROW actually
  // reads visually (siblings' own cards), not over wherever a sibling's
  // spouse's distant ancestor fan happens to reach (a real bug: a single
  // sibling married into a large family inflated `width` — computed over
  // ALL slots, core and lateral alike — enough to drag rootId's own
  // parents far sideways, chasing a width that was never actually about
  // the sibling row itself).
  let siblingCoreRowWidth = 0;
  siblingIds.forEach((id) => {
    const siblingUnit = layoutUnit(
      id,
      siblingDirection === 1 ? "right" : "left",
      ctx,
      siblingDirection,
    );
    const desiredX = siblingCursor + siblingDirection * UNIT_X_SPACING;
    // siblingUnit.coreSlots/lateralGroups (not just .slots as one flat
    // blob) — a sibling's own spouse and THEIR ancestor fan/siblings can
    // occupy a generation rootId's OWN parents need next (see
    // parentRowCenter below) — this sibling's own core (the sibling
    // themself + their direct spouse/ancestor line) must not get dragged
    // by, and must not itself drag, its own further lateral riders (see
    // placePiece's own doc on lateralGroups — this is the fifth
    // occurrence of the anchor-drag bug class, on the sibling-row path).
    const actualX = placePiece(
      siblingUnit.slots,
      desiredX,
      0,
      siblingDirection,
      siblingUnit.coreSlots,
      siblingUnit.lateralGroups,
    );
    siblingCursor = actualX + siblingDirection * siblingUnit.width;
    siblingCoreRowWidth = Math.max(siblingCoreRowWidth, Math.abs(actualX));
    // This sibling (+ their own full subtree) becomes its OWN lateral
    // group for whoever places THIS layoutUnit result as a piece further
    // up — never merged with any other sibling's group (each already got
    // its own independent push above; that independence must survive
    // being bubbled up too, or the fourth-occurrence bug this whole
    // grouping mechanism exists for reappears one level higher). Stamped
    // with `siblingDirection` — this level's own unambiguous axis for
    // "which way rootId's own siblings extend relative to rootId" — so
    // that once this whole layoutUnit result is folded into a combined
    // couple-fan piece (layoutCoupleFan's `arePartners` branch), rootId's
    // own siblings keep pushing on THEIR side even if that combined piece
    // later gets folded again into a further outer piece with a different
    // `direction` (see LateralGroup's own doc, and layoutUnit's own doc on
    // `isTopLevel`).
    lateralGroups.push({
      slots: siblingUnit.slots.map((s) => ({
        ...s,
        relativeX: s.relativeX + actualX,
      })),
      direction: siblingDirection,
    });
  });
  const siblingRowWidth = siblingCoreRowWidth;

  // ADDITIONAL PARTNERSHIPS (2nd, 3rd, ...): each extra partner is placed
  // as its OWN couple unit — same placePartner logic as the primary
  // partner above (own ancestor fan, own siblings, own shared-children row
  // via childUnitsFor), just on siblingDirection (the side NOT claimed by
  // the primary partner) instead of partnerSide, at increasing distance
  // past rootId's own siblings — so the stable left-to-right order reads
  // [extra partner's own fan] [extra partner] [rootId's siblings]
  // [rootId] [primary partner] [primary partner's own fan], matching the
  // order partnersOf itself preserves (DB row order), not an arbitrary
  // Set/Map iteration order. Siblings and extra partners share one running
  // cursor on siblingDirection so they don't collide with each other —
  // extra partners are placed AFTER siblings, continuing outward from
  // siblingCursor (siblings closer to rootId, extra partners further out;
  // an extra partner never has a "sibling of the couple" adjacency
  // convention to preserve the way the primary partner does, so there's no
  // reason to interleave them).
  let extraPartnerCursor = siblingCursor;
  for (const extraPartnerId of extraPartnerIds) {
    if (ctx.visited.has(extraPartnerId)) continue; // claimed as a sibling's own partner in the meantime
    const desiredX = extraPartnerCursor + siblingDirection * UNIT_X_SPACING;
    // extraPartnerId is itself a lateral rider relative to rootId (only
    // the PRIMARY partner counts as this unit's own anchor) — its
    // coreSlots are intentionally discarded here, not folded into this
    // unit's own coreSlots. Its OWN core + lateralGroups are folded into
    // ONE combined group below (not kept separate) — extraPartnerId's own
    // subtree was already placed internally-consistent (siblings pushed
    // individually against IT, per placePartner's own doc), so it must
    // move as one unit if something ABOVE this level ever needs to push
    // it further; it just must never share a push with rootId's own
    // unrelated siblings, which this grouping still keeps independent.
    const {
      actualX,
      coreSlots: extraPartnerCoreSlots,
      lateralGroups: extraPartnerLateralGroups,
    } = placePartner(extraPartnerId, siblingDirection, desiredX);
    extraPartnerCursor = actualX;
    lateralGroups.push({
      slots: [
        ...extraPartnerCoreSlots,
        ...extraPartnerLateralGroups.flatMap((g) => g.slots),
      ],
      direction: siblingDirection,
    });
  }

  /**
   * Places thisPartnerId (rootId's partner in one specific partnership) —
   * their own ancestor fan, their own siblings, and the children rootId
   * shares specifically with THEM (via childUnitsFor, centered under this
   * exact pair's own midpoint) — as one self-contained couple unit on
   * `side`. Shared by the primary-partner placement above and the extra-
   * partners loop above, parametrized only by which partner and which
   * side, so there is exactly one implementation of "place a couple" for
   * however many partnerships rootId has. `desiredX` overrides the default
   * PARTNER_X_SPACING offset (used by extra partners, which stack outward
   * past rootId's own siblings rather than sitting at the couple's own
   * tight gap — see the extra-partners loop's own doc).
   *
   * Returns `coreSlots` (thisPartnerId + their own DIRECT ancestor fan, no
   * siblings) alongside `actualX` — the caller uses this to fold the
   * PRIMARY partner into ITS OWN unit's anchor (see coreSlots' own doc on
   * layoutUnit), while discarding it for extra partners (who are
   * themselves lateral riders relative to rootId). Also returns
   * `lateralGroups` — thisPartnerId's own siblings, each already its own
   * independently-placed group (see the sibling loop below) — bubbled up
   * so an EXTRA partner's own children/siblings, when this whole
   * placePartner result is itself treated as one big lateral rider by the
   * extra-partners loop below, still get their own individual pushes
   * instead of being flattened into one shared blob (see placePiece's own
   * doc on lateralGroups for the bug this avoids).
   */
  function placePartner(
    thisPartnerId: string,
    side: 1 | -1,
    desiredX?: number,
  ): { actualX: number; coreSlots: UnitSlot[]; lateralGroups: LateralGroup[] } {
    ctx.visited.add(thisPartnerId);
    const thisPartnerSiblingIds = collectSiblings(thisPartnerId, ctx);
    const thisPartnerParents = ctx.parentsOf.get(thisPartnerId) ?? [];
    const thisPartnerParentFan = layoutCoupleFan(
      thisPartnerParents.filter(
        (id) => ctx.visibleIds.has(id) && !ctx.visited.has(id),
      ),
      ctx,
    );

    // thisPartnerId (+ their own ancestor fan, generation -1 relative to
    // them — never reaches generation +1) is placed FIRST, on its own,
    // deliberately BEFORE thisPartnerSiblingIds below — see that block's
    // own doc for why order matters here: a sibling's own DESCENDANTS can
    // land at the exact same generation as rootId's own children purely by
    // coincidence of tree depth (an uncle/aunt's kids are ordinary cousins
    // of rootId's children, not a positional constraint on them), so they
    // must never get to "claim" that generation's collision extent before
    // rootId's own children do.
    //
    // partnerPieceSlots is thisPartnerId + ONLY thisPartnerParentFan's own
    // CORE (their direct ancestor line) — NOT its full .slots, which can
    // itself contain wide lateral riders (thisPartnerId's own aunts/
    // uncles and their families, folded in by layoutCoupleFan's own
    // nested layoutUnit call). Those lateral riders are passed separately
    // via thisPartnerParentFan.lateralGroups below, each getting its own
    // independent push instead of dragging thisPartnerId sideways with
    // them (see placePiece's own doc on lateralGroups for the bug this
    // avoids — this is the exact path that produced the reported Дарья/
    // Виктор/Галина bug).
    const partnerPieceSlots: UnitSlot[] = [
      { id: thisPartnerId, relativeX: 0, relativeGeneration: 0 },
      ...(thisPartnerParentFan?.coreSlots.filter(
        (s) => !(s.relativeGeneration === 0 && s.id === thisPartnerId),
      ) ?? []),
    ];
    const partnerParentFanLateralSlots =
      thisPartnerParentFan?.lateralGroups.flatMap((g) => g.slots) ?? [];
    const fullPartnerPieceSlots = [
      ...partnerPieceSlots,
      ...partnerParentFanLateralSlots,
    ];
    const slotsBeforePartnerPiece = slots.length;
    const actualX = placePiece(
      fullPartnerPieceSlots,
      desiredX ?? side * PARTNER_X_SPACING,
      0,
      side,
      partnerPieceSlots,
      thisPartnerParentFan?.lateralGroups,
    );
    const partnerCoreSlots = partnerPieceSlots.map((s) => ({
      ...s,
      relativeX: s.relativeX + actualX,
    }));
    // thisPartnerParentFan's own lateral groups (thisPartnerId's aunts/
    // uncles and their families) become part of THIS placePartner call's
    // own returned lateralGroups too, at their ACTUAL final positions.
    const partnerParentFanPlacedById = new Map(
      slots.slice(slotsBeforePartnerPiece).map((s) => [s.id, s]),
    );
    // Overwrites each group's own (possibly deeper-nested) stamp with
    // `side` — this function's own unambiguous local axis for "which way
    // thisPartnerId's own ancestor fan extends relative to rootId". A
    // group here may already carry a stamp from a nested layoutCoupleFan
    // call several ancestor generations up (e.g. thisPartnerId's own
    // grandparent's own sibling) — that stamp was only ever meaningful
    // relative to ITS OWN couple's local axis, and this placePartner call
    // already placed it correctly using `side` (not that stamp — see the
    // placePiece call above, which never sets allowDirectionOverride).
    // Once bubbled up past this point, all that matters to any FURTHER
    // outer piece is which side of rootId the whole group sits on, which
    // is exactly `side` — carrying the stale deeper stamp forward instead
    // would let it resurface and get misread again once this whole
    // placePartner result eventually reaches the one true top-level
    // `placePiece` call that actually reads stamps (see LateralGroup's own
    // doc, and layoutUnit's own doc on `isTopLevel`).
    const partnerParentFanLateralGroups: LateralGroup[] = (
      thisPartnerParentFan?.lateralGroups ?? []
    ).map((group) => ({
      slots: group.slots.map((s) => partnerParentFanPlacedById.get(s.id)!),
      direction: side,
    }));

    // Children rootId shares specifically with thisPartnerId, centered
    // under this exact pair's own midpoint — NOT under rootId+primary
    // partner's row when thisPartnerId is an extra partner (see
    // childUnitsFor's own doc on per-couple child attribution). `side` is
    // passed as firstChildDirection so a collision on the first child
    // pushes further AWAY from rootId in the same direction this couple
    // itself grew in, not always "right" — critical once an extra
    // partner's own couple sits on rootId's negative side (see
    // layoutChildrenRow's own doc on firstChildDirection for the exact bug
    // this avoids: a first child jumping back across rootId's position).
    //
    // Placed BEFORE thisPartnerSiblingIds below (see that block's own
    // doc) — this is what actually fixes a real reported bug: a partner's
    // sibling who is themself partnered with children (an ordinary
    // uncle/aunt's own kids) used to occupy generation+1's shared extent
    // FIRST, so rootId's own children got shoved far sideways to avoid
    // "colliding" with cousins they have no positional relationship to at
    // all — genealogically unrelated branches that only happen to share a
    // generation should never outrank the couple's own direct children for
    // center-of-row placement.
    const thisCoupleChildUnits =
      thisPartnerId === partnerId ? childUnits : childUnitsFor(thisPartnerId);
    // Each child unit (already individually pushed by layoutChildrenRow's
    // own placePiece calls) comes back as its own lateral group — see
    // layoutChildrenRow's own doc — for when THIS whole placePartner
    // result later rides as one lateral rider elsewhere (an extra
    // partner's own children, bubbled up by the extra-partners loop).
    // Starts with thisPartnerParentFan's own lateral groups (thisPartnerId's
    // aunts/uncles), computed above.
    const partnerLateralGroups: LateralGroup[] = [
      ...partnerParentFanLateralGroups,
      ...layoutChildrenRow(
        placePiece,
        slots,
        thisCoupleChildUnits,
        actualX / 2,
        side,
      ),
    ];

    // thisPartnerId's own siblings (and THEIR full subtrees — own partner,
    // own descendants, own ancestor fan) extend further toward `side`,
    // past thisPartnerId — placed LAST, after rootId's own children row
    // above, so a sibling's descendants reaching into the same generation
    // as those children get pushed out of THEIR way instead of the other
    // way around (see this function's own doc above for the bug this
    // ordering fixes). Same reasoning as rootId's own siblings above:
    // separates the couple from the partner's own sibling, not just from
    // rootId's — starts a full UNIT_X_SPACING beyond the partner's own
    // position.
    let partnerSiblingCursor = actualX;
    // forcePartnerSide=side: same fix as rootId's own siblings —
    // this partner-sibling's own partner must sit further in `side`,
    // past the sibling, never flipped back toward rootId's partner by pure
    // gender order (the exact reported bug: a sibling's spouse landing
    // between the sibling and rootId's own partner instead of past both).
    thisPartnerSiblingIds.forEach((id) => {
      const siblingUnit = layoutUnit(
        id,
        side === 1 ? "right" : "left",
        ctx,
        side,
      );
      const desiredSiblingX = partnerSiblingCursor + side * UNIT_X_SPACING;
      // Same core/lateral split as rootId's own siblingIds loop above —
      // this partner-sibling's own spouse/ancestor fan must not drag the
      // sibling themself sideways (see placePiece's own doc on
      // lateralGroups).
      const actualSiblingX = placePiece(
        siblingUnit.slots,
        desiredSiblingX,
        0,
        side,
        siblingUnit.coreSlots,
        siblingUnit.lateralGroups,
      );
      partnerSiblingCursor = actualSiblingX + side * siblingUnit.width;
      // Stamped with `side` — this function's own unambiguous local axis
      // for "which way thisPartnerId's own siblings extend relative to
      // rootId" — so that once this whole placePartner result becomes part
      // of a combined couple-fan piece (layoutCoupleFan's `arePartners`
      // branch folds rootId's OWN siblings and thisPartnerId's OWN siblings
      // into one array), thisPartnerId's siblings keep pushing on THEIR
      // side even after that combined piece itself gets folded again into
      // a further outer piece with a different `direction` (see
      // LateralGroup's own doc, and layoutUnit's own doc on `isTopLevel`,
      // for why an unstamped group would otherwise silently inherit
      // whatever `direction` the outermost allowDirectionOverride call
      // happens to use).
      partnerLateralGroups.push({
        slots: siblingUnit.slots.map((s) => ({
          ...s,
          relativeX: s.relativeX + actualSiblingX,
        })),
        direction: side,
      });
    });

    return {
      actualX,
      coreSlots: partnerCoreSlots,
      lateralGroups: partnerLateralGroups,
    };
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
    // an arbitrary pick: the primary partner's own parent fan (placed
    // inside placePartner above) was already placed above, at generation
    // -1, on partnerSide — if
    // rootId's own parents collide with it (the common case: BOTH sides
    // of a couple have their own two parents visible, so both fans land
    // near generation -1 at once), they must be pushed AWAY from the
    // partner's side, not toward it (pushing toward it would shove
    // rootId's own parents on top of where the partner's parents are
    // headed, the exact bug this fixes).
    //
    // parentFan.coreSlots (not .slots) decides the push — rootId's own
    // parents' fan can itself contain wide lateral riders (their own
    // siblings, e.g. rootId's aunts/uncles and THEIR families, folded in
    // by layoutCoupleFan's own nested layoutUnit call) that must never
    // drag rootId's actual parents sideways just because some great-aunt's
    // own descendants happen to collide with something several branches
    // over (see placePiece's own doc on corePieceSlots — this is the
    // third occurrence of that same class of bug, fixed generally there).
    //
    // WHEN rootId HAS a partner whose own parent fan is already placed
    // (the common case a collision here actually happens for): pushing
    // parentFan alone by the FULL amount needed to clear it drags rootId's
    // own parents a whole PARTNER_X_SPACING+ away from rootId, purely
    // because rootId's own fan happens to be placed SECOND — genealogically
    // rootId's own parents belong centered over rootId regardless of
    // placement order (the exact reported bug: Виктор's own parents ended
    // up centered a full PARTNER_X_SPACING to the left of Виктор instead of
    // directly above him, because Галина's own parent fan — placed first —
    // kept its natural position and Виктор's fan alone absorbed the entire
    // separating push). rootId itself can never move (layoutUnit's own
    // invariant: rootId sits at relativeX EXACTLY 0, every caller relies on
    // this without re-checking), and rootId's own siblings/extra partners
    // (also already in `slots`/`extent` by this point, but on
    // siblingDirection — the SAME side parentFan itself needs) must not
    // move either, or they'd be dragged off toward partnerSide for no
    // reason. Only partnerBlockIds (the primary partner + their own full
    // subtree, captured above) is free to widen further outward on
    // partnerSide with no positional constraint beyond a MINIMUM
    // PARTNER_X_SPACING gap from rootId — so half the push is applied
    // there instead, splitting the separation instead of rootId's own
    // parents absorbing it alone.
    if (hasPartner && partnerBlockIds.size > 0) {
      const parentFanCoreExtent = computeExtentByGeneration(
        parentFan.coreSlots,
      );
      const neededPush = resolveCollision(
        extent,
        parentFanCoreExtent,
        parentRowCenter,
        siblingDirection,
      );
      if (neededPush > 0) {
        const coupleShift = neededPush / 2;
        for (const slot of slots) {
          if (partnerBlockIds.has(slot.id))
            slot.relativeX += partnerSide * coupleShift;
        }
        for (const slot of coreSlots) {
          if (partnerBlockIds.has(slot.id))
            slot.relativeX += partnerSide * coupleShift;
        }
        for (const group of lateralGroups) {
          for (const slot of group.slots) {
            if (partnerBlockIds.has(slot.id))
              slot.relativeX += partnerSide * coupleShift;
          }
        }
        // extent is per-generation aggregated, not per-id — recomputed
        // from scratch from the now-shifted `slots` rather than guessing
        // which generations belong to the partner block (siblings/extra
        // partners can share a generation with the partner's own fan/
        // children, e.g. both at rootId's own generation 0).
        const recomputed = computeExtentByGeneration(slots);
        extent.clear();
        for (const [generation, range] of recomputed)
          extent.set(generation, range);
      }
    }
    const slotsBeforeParentFan = slots.length;
    const parentFanActualX = placePiece(
      parentFan.slots,
      parentRowCenter,
      0,
      siblingDirection,
      parentFan.coreSlots,
      parentFan.lateralGroups,
      isTopLevel,
    );
    // rootId's own parents (the anchor part of parentFan) become part of
    // THIS unit's own coreSlots too — they're rootId's direct ancestors,
    // not a lateral rider, so whoever places THIS layoutUnit result as a
    // piece (a sibling call, a child call, layoutCoupleFan itself) must
    // still treat them as anchor, recursively.
    for (const slot of parentFan.coreSlots) {
      coreSlots.push({ ...slot, relativeX: slot.relativeX + parentFanActualX });
    }
    // parentFan's own lateral groups (rootId's aunts/uncles and their
    // families) bubble up as THIS unit's own lateral groups too, at their
    // ACTUAL final positions (read back from `slots`, which placePiece
    // just populated with each group's own independently-resolved push —
    // see placePiece's own doc on lateralGroups) — preserving their
    // independence at every level of recursion, exactly like the primary
    // partner's own lateral groups above. Each group's stamp is overwritten
    // with `siblingDirection` — this level's own unambiguous axis for
    // "which way rootId's whole parentFan extends relative to rootId" —
    // same reasoning as placePartner's own bubbling of
    // thisPartnerParentFan's lateral groups (see its own doc): a group here
    // may carry a stamp from a deeper nested couple's own local axis, which
    // is no longer meaningful once bubbled up past this point.
    const placedSlotById = new Map(
      slots.slice(slotsBeforeParentFan).map((s) => [s.id, s]),
    );
    for (const group of parentFan.lateralGroups) {
      lateralGroups.push({
        slots: group.slots.map((s) => placedSlotById.get(s.id)!),
        direction: siblingDirection,
      });
    }
  }

  // Children sit one generation down, centered under rootId (NOT under the
  // ancestor fan above — descendants are "below the couple", regardless of
  // how wide either spouse's own ancestor line fans out). Only reached
  // when rootId has NO partner at all — when hasPartner is true, rootId's
  // children (attributed to the primary partner by childUnitsFor's own
  // fallback: no second recorded parent, or the primary partner by name)
  // were already placed inside placePartner(partnerId!, partnerSide)
  // above, centered under that specific couple's own midpoint instead of
  // under rootId alone. Each child unit is placed one at a time, left-to-
  // right alternating outward from center, checked against EVERYTHING
  // placed so far (siblings, parent+fan, and any earlier children already
  // placed) — this is what catches a child's own spouse's ancestor fan
  // reaching back into an already-occupied generation (the exact bug this
  // whole incremental-placement approach exists for).
  if (!hasPartner) {
    lateralGroups.push(...layoutChildrenRow(placePiece, slots, childUnits, 0));
  }

  const width = Math.max(0, ...slots.map((s) => Math.abs(s.relativeX)));

  return { width, slots, coreSlots, lateralGroups, extentByGeneration: extent };
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
 *
 * Returns `coreSlots` alongside `slots` — just leftId/rightId + their own
 * DIRECT ancestor fan (no siblings, no siblings' descendants) — so the
 * caller's own `placePiece` can use `coreSlots` to decide how far to push
 * this whole fan on collision, without the fan's own lateral riders
 * (leftId's/rightId's siblings and everyone under them) dragging the
 * couple itself along for a ride they have no actual stake in (see
 * `placePiece`'s own doc on `corePieceSlots` for the full explanation).
 * Also returns `lateralGroups` — each of leftId's/rightId's own lateral
 * groups (their siblings, their siblings' own siblings recursively, etc),
 * individually re-offset the same way `coreSlots` is — so the caller can
 * give each one its own independent push too, instead of flattening them
 * into one shared blob (see `placePiece`'s own doc on `lateralGroups`).
 */
function layoutCoupleFan(
  parentIds: string[],
  ctx: LayoutContext,
): {
  slots: UnitSlot[];
  coreSlots: UnitSlot[];
  lateralGroups: LateralGroup[];
} | null {
  const { leftId, rightId, arePartners } = orderCoupleBySlot(
    parentIds,
    ctx.partnersOf,
    ctx.genderOf,
  );
  if (!leftId && !rightId) return null;

  const slots: UnitSlot[] = [];
  const coreSlots: UnitSlot[] = [];
  const lateralGroups: LateralGroup[] = [];

  const foldIn = (
    unit: {
      slots: UnitSlot[];
      coreSlots: UnitSlot[];
      lateralGroups: LateralGroup[];
    },
    offsetX: number,
  ) => {
    for (const slot of unit.slots) {
      slots.push({
        ...slot,
        relativeX: slot.relativeX + offsetX,
        relativeGeneration: slot.relativeGeneration - 1,
      });
    }
    for (const slot of unit.coreSlots) {
      coreSlots.push({
        ...slot,
        relativeX: slot.relativeX + offsetX,
        relativeGeneration: slot.relativeGeneration - 1,
      });
    }
    for (const group of unit.lateralGroups) {
      lateralGroups.push({
        slots: group.slots.map((s) => ({
          ...s,
          relativeX: s.relativeX + offsetX,
          relativeGeneration: s.relativeGeneration - 1,
        })),
        direction: group.direction,
      });
    }
  };

  if (leftId && rightId && arePartners) {
    // One layoutUnit call covers both — rightId is leftId's own partner,
    // placed internally at leftId's own outward side (side="left" here
    // means outward=-1, so the partner lands on leftId's outward/left
    // side too — see layoutUnit's own partner-placement, which always
    // puts the partner on `outward`, matching the couple's own established
    // left/right order since orderCoupleBySlot already put leftId on the
    // male/left slot when genders are known).
    const leftUnit = layoutUnit(leftId, "left", ctx);
    // leftUnit.lateralGroups mixes riders from BOTH spouses' own sides —
    // leftId's own siblings (naturally negative/left of leftId's own local
    // 0, stamped by layoutUnit's own sibling loop) AND rightId's own
    // siblings/parentFan riders, bubbled up from the nested placePartner
    // call (naturally positive/right, since rightId sits at leftId's local
    // +PARTNER_X_SPACING — stamped by placePartner itself). Both sources
    // already stamp their own groups with THEIR OWN unambiguous local
    // `direction` at the exact point where "which side" is unambiguous
    // (see layoutUnit's own sibling loop and placePartner's own docs) — no
    // further stamping needed here, just fold the whole thing through
    // unchanged.
    foldIn(leftUnit, -PARTNER_X_SPACING / 2);
    return { slots, coreSlots, lateralGroups };
  }

  // leftId and rightId are NOT partners of each other here — two recorded
  // parents who were never married to each other (e.g. rootId's mother and
  // father separately remarried other people). Each one's OWN partner (if
  // any) is a completely different, unrelated person with no guaranteed
  // left/right relationship to the couple-fan's own outer slot — layoutUnit's
  // default gender rule (husband left of HIS OWN wife, wife right of HER OWN
  // husband) would happily place leftId's new partner toward the right
  // whenever that partner is female, walking it straight past rightId's own
  // side (the exact bug this pinPartnerSide fixes: leftId=dad, rightId=mom,
  // dad's new wife is female so gender-rule placed her on dad's right — i.e.
  // toward mom — crossing the two couples into dad / mom's-new-husband /
  // dad's-new-wife / mom instead of staying strictly split left/right of
  // the fan's own center). pinPartnerSide=-1 for leftId and +1 for rightId
  // pin each one's own partner (and further ancestor fan) to keep growing
  // in the SAME outward direction the couple fan itself put them in — a
  // HARD override (unlike the sibling case in layoutUnit's own sibling
  // loop, which uses the SOFT forcePartnerSide instead): keeping two
  // unrelated ancestor lines from crossing is a higher-priority invariant
  // here than gender order within this particular new pairing, since
  // there's no sensible "husband left of wife" reading when the wife in
  // question belongs to a completely different family line than the
  // person she'd be flipped toward (see pinPartnerSide's own doc on
  // layoutUnit for why this case is different from the sibling one).
  if (leftId) {
    const leftUnit = layoutUnit(leftId, "left", ctx, undefined, -1);
    foldIn(leftUnit, -UNIT_X_SPACING / 2);
  }
  if (rightId) {
    const rightUnit = layoutUnit(rightId, "right", ctx, undefined, 1);
    foldIn(rightUnit, UNIT_X_SPACING / 2);
  }

  return { slots, coreSlots, lateralGroups };
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
  placePiece: (
    pieceSlots: UnitSlot[],
    desiredX: number,
    generationDelta: number,
    direction: 1 | -1,
    corePieceSlots?: UnitSlot[],
    lateralGroups?: LateralGroup[],
  ) => number,
  /** All slots placePiece has pushed so far — used to read back a child's ACTUAL final position (post core/lateral split), not its pre-push local one. See the doc below on why unit.width alone isn't enough here. */
  placedSlots: UnitSlot[],
  childUnits: {
    width: number;
    slots: UnitSlot[];
    coreSlots?: UnitSlot[];
    lateralGroups?: LateralGroup[];
  }[],
  center: number,
  /**
   * Which way a COLLISION on the very first child (index 0, placed exactly
   * at `center`) should push it: +1 (right) or -1 (left). Every layout in
   * the tree used to have exactly one couple per generation growing off
   * rootId, always toward rootId's own positive side (primary partner side
   * — center always >= 0), so hardcoding +1 here never mattered. With
   * multiple partnerships, an EXTRA partner's own couple can sit on
   * rootId's negative side (siblingDirection, see placePartner) — its
   * center is negative, and a first child pushed +1 on collision would
   * jump back across rootId's own position (and everything already placed
   * between them) instead of moving further away from the couple, same
   * direction the couple itself grew in. Defaults to 1 (the couple's own
   * partnerSide sign for the common single-partnership case) so every
   * existing caller/test keeps its exact prior behavior.
   */
  firstChildDirection: 1 | -1 = 1,
): LateralGroup[] {
  // Alternate: 1st child at center, 2nd to its right, 3rd to its left, 4th
  // further right, etc. — keeps the row visually balanced around `center`
  // regardless of how many children there are, same intent the old
  // symmetric-reservation version had, just built incrementally instead of
  // pre-computed (pre-computing would need the same per-generation extent
  // math this function's caller already does, for no added benefit).
  let rightCursor = center;
  let leftCursor = center;
  // Each child unit — already individually pushed by its own placePiece
  // call below — is returned as its own group, at its ACTUAL final
  // position, so a caller folding this whole children row into a larger
  // piece (see placePartner's own lateralGroups) can give each child their
  // own independent push too, instead of flattening the whole row into
  // one shared blob (see placePiece's own doc on lateralGroups).
  const placedGroups: LateralGroup[] = [];
  childUnits.forEach((unit, index) => {
    // Alternates starting from firstChildDirection instead of always
    // starting from "right" — index 0 uses firstChildDirection itself,
    // every later index still alternates the same way as before relative
    // to that starting side (1st, 3rd, 5th... on the starting side; 2nd,
    // 4th... on the other), so the row still reads as balanced around
    // `center` regardless of which side it starts growing toward.
    const placeOnRight =
      index % 2 === 0 ? firstChildDirection === 1 : firstChildDirection === -1;
    // A child unit is itself a full layoutUnit result — it can carry its
    // OWN wide lateral tail (the child's own spouse's many siblings, each
    // with their own family — the exact shape that produced the reported
    // Елизавета Купчик/Григорий Кривуша bug: a child married into a large
    // family got dragged far from `center` by their own in-laws' siblings
    // instead of landing near it). Passing unit.coreSlots/lateralGroups
    // through (when present — a child unit built by childUnitsFor always
    // has them; other callers of this function default to none, which
    // falls back to the old single-push behavior) lets THIS child's own
    // core stay near `center`, exactly like every other core/lateral split
    // in this file (see placePiece's own doc).
    let actualX: number;
    const slotsBeforeThisUnit = placedSlots.length;
    if (placeOnRight) {
      const desiredX =
        index === 0 ? center : rightCursor + UNIT_X_SPACING + unit.width;
      actualX = placePiece(
        unit.slots,
        desiredX,
        1,
        1,
        unit.coreSlots,
        unit.lateralGroups,
      );
      rightCursor = actualX + unit.width;
    } else {
      const desiredX =
        index === 0 ? center : leftCursor - UNIT_X_SPACING - unit.width;
      actualX = placePiece(
        unit.slots,
        desiredX,
        1,
        -1,
        unit.coreSlots,
        unit.lateralGroups,
      );
      leftCursor = actualX - unit.width;
    }
    // Read back each slot's ACTUAL final position from placedSlots (what
    // placePiece just pushed there) rather than reapplying a single
    // `actualX` to every slot — a lateral rider within this child unit may
    // have landed at a further-nudged position than the unit's own core
    // (see placePiece's own doc on lateralGroups).
    const placedById = new Map(
      placedSlots.slice(slotsBeforeThisUnit).map((s) => [s.id, s]),
    );
    placedGroups.push({ slots: unit.slots.map((s) => placedById.get(s.id)!) });
  });
  return placedGroups;
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
