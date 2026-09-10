import type { FamilyGraph, Gender, Relationship } from "./types";

/**
 * random-graph.ts — deterministic (seeded) random FamilyGraph generator for
 * property-based invariant testing (see invariants.property.test.ts and the
 * tree-layout-rewrite plan §8a). No external fuzzing library — package.json
 * has no fast-check, and a small custom mulberry32 PRNG is enough for a
 * seeded, reproducible generator: every failure prints its seed, so a CI
 * failure is a one-line repro (`generateRandomFamily({ seed: 12345, ... })`),
 * not a flaky/unreproducible fuzz failure.
 *
 * Stage 1 (see rewrite plan §7) only exercised the DOWN direction — every
 * generated graph was a pure descendant tree from a single root couple, no
 * ancestors above the root and no in-law side-branches. Stage 3 adds ancestor
 * generation above the focus (growAncestors, mirroring growDescendants'
 * shape: a parent pair, that pair's own siblings, recursing upward) plus
 * occasional in-law ancestor branches (a descendant's spouse getting their
 * own recorded parents, exercising growInLawAncestors) — see
 * generateRandomFamily's own `direction` option.
 */

export interface RandomFamilyOptions {
  /** PRNG seed — same seed always produces the same graph. */
  seed: number;
  /** Total number of persons to generate (approximate — actual count can be
   *  slightly lower if the branching process terminates early). */
  personCount: number;
  /** 0..1 — probability a person who already has one partnership starts a
   *  second one (remarriage/divorce+remarriage branch). */
  remarriageProbability?: number;
  /** 0..1 — probability a newly-created partnership is between two people
   *  of the same gender (exercises the same-sex ordering tie-break once that
   *  lands — currently just varies gender pairing, shouldBeLeft already
   *  handles it via id tie-break). */
  sameSexProbability?: number;
  /** 0..1 — probability a person has NO recorded second parent for their
   *  children (SoloParent path). */
  soloParentProbability?: number;
  /** Average number of children per partnership (Poisson-ish via repeated
   *  coin flips, not a hard cap — some branches will have more, some fewer,
   *  0 is legal and common). */
  averageChildren?: number;
  /**
   * "down" (default, Stage 1 behavior): pure descendant tree from the root,
   * no ancestors, no in-laws. "up": ALSO grows ancestors above the root
   * (growBranch("up")'s own territory — parent pairs, their own sibling
   * rows, recursing upward) and occasionally gives a descendant's spouse
   * their own recorded parents (growInLawAncestors' territory). "both" is an
   * alias users may want later; not needed yet — every current call site
   * either wants pure descendants (existing Stage 1/2 tests) or the fuller
   * "up" shape (Stage 3's own property tests).
   */
  direction?: "down" | "up";
  /** 0..1, only meaningful with direction:"up" — probability a placed
   *  descendant's spouse (an in-law with no recorded parents by default)
   *  gets their own parent(s) generated too, exercising
   *  growInLawAncestors. */
  inLawAncestorProbability?: number;
  /** Average number of siblings-of-a-sibling generated per ancestor pair
   *  when direction:"up" (mirrors averageChildren, just for the upward
   *  side's own sibling rows — an ancestor pair's OTHER children besides
   *  the one who pulled them into the graph). */
  averageAncestorSiblings?: number;
  /** Maximum number of generations to grow upward when direction:"up" — caps
   *  runaway recursion on a high personCount budget the same way
   *  randomChildCount's own cap (6) does for the downward side. */
  maxAncestorGenerations?: number;
}

/** mulberry32 — tiny, fast, seeded PRNG. Public-domain algorithm; good enough
 *  statistical quality for test-data generation (not cryptographic use). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Generates a random FamilyGraph rooted at a single couple (or solo person).
 * Returns the graph plus the id to use as focusPersonId — always the root,
 * so buildTreeLayout grows the WHOLE generated graph from a single fixed
 * origin. With `direction: "down"` (the default), the root's own ancestry is
 * never generated — every person is a descendant of the root. With
 * `direction: "up"`, the root ALSO gets ancestors grown above it (and
 * descendants' spouses occasionally get their own recorded parents too),
 * exercising growBranch("up") and growInLawAncestors as well as
 * growBranch("down").
 */
export function generateRandomFamily(options: RandomFamilyOptions): {
  graph: FamilyGraph;
  focusPersonId: string;
} {
  idCounter = 0;
  const rng = mulberry32(options.seed);
  const remarriageProbability = options.remarriageProbability ?? 0.1;
  const sameSexProbability = options.sameSexProbability ?? 0.05;
  const soloParentProbability = options.soloParentProbability ?? 0.1;
  const averageChildren = options.averageChildren ?? 1.8;

  const persons: FamilyGraph["persons"] = [];
  const relationships: Relationship[] = [];

  function randomGender(): Gender {
    const r = rng();
    return r < 0.48 ? "male" : r < 0.96 ? "female" : "unknown";
  }

  function makePerson(gender: Gender): string {
    const id = nextId("p");
    persons.push({ id, firstName: id, lastName: "Test", gender });
    return id;
  }

  function makePartnership(aId: string, bId: string): string {
    const id = nextId("rel-spouse");
    const status: Relationship["status"] =
      rng() < 0.15 ? "divorced" : rng() < 0.05 ? "widowed" : "married";
    relationships.push({ id, kind: "spouse", from: aId, to: bId, status });
    return id;
  }

  function makeParentChild(parentId: string, childId: string): void {
    relationships.push({
      id: nextId("rel-pc"),
      kind: "parent-child",
      from: parentId,
      to: childId,
    });
  }

  /** Poisson-ish child count via repeated coin flips against averageChildren. */
  function randomChildCount(): number {
    let count = 0;
    // p chosen so E[count] ~= averageChildren for a geometric-ish process,
    // capped at 6 so a single branch can't runaway-explode personCount.
    const p = Math.min(0.85, averageChildren / (averageChildren + 1));
    while (count < 6 && rng() < p) count++;
    return count;
  }

  const direction = options.direction ?? "down";
  const inLawAncestorProbability = options.inLawAncestorProbability ?? 0.15;
  const averageAncestorSiblings = options.averageAncestorSiblings ?? 1.2;
  const maxAncestorGenerations = options.maxAncestorGenerations ?? 4;

  /** Poisson-ish sibling count for an ancestor pair's OWN other children (mirrors randomChildCount, smaller default average, smaller cap). */
  function randomAncestorSiblingCount(): number {
    let count = 0;
    const p = Math.min(
      0.8,
      averageAncestorSiblings / (averageAncestorSiblings + 1),
    );
    while (count < 4 && rng() < p) count++;
    return count;
  }

  // Grows one person's own descendant branch: gives them a partnership (or
  // leaves them solo per soloParentProbability), then recursively grows
  // however many children the coin flips produce, stopping once the running
  // total hits personCount.
  function growDescendants(personId: string, personGender: Gender): void {
    if (persons.length >= options.personCount) return;

    const isSoloParent = rng() < soloParentProbability;
    let partnerId: string | undefined;
    if (!isSoloParent && persons.length < options.personCount) {
      const sameSex = rng() < sameSexProbability;
      const partnerGender: Gender = sameSex
        ? personGender
        : personGender === "male"
          ? "female"
          : personGender === "female"
            ? "male"
            : randomGender();
      partnerId = makePerson(partnerGender);
      makePartnership(personId, partnerId);

      // In-law ancestors (direction:"up" only — see growInLawAncestors'
      // real-data motivation, Viktor Kupchik's wife Galina having her own
      // recorded parents): the spouse just created has NO parentIds by
      // default (an ordinary in-law) — occasionally give them one too,
      // exercising the sweep that discovers ancestors reached through a
      // DOWNWARD path from the focus rather than the focus's own upward
      // chain.
      if (direction === "up" && rng() < inLawAncestorProbability) {
        growAncestors(partnerId, 1);
      }
    }

    const childCount = randomChildCount();
    for (let i = 0; i < childCount; i++) {
      if (persons.length >= options.personCount) break;
      const childGender = randomGender();
      const childId = makePerson(childGender);
      makeParentChild(personId, childId);
      if (partnerId) makeParentChild(partnerId, childId);
      growDescendants(childId, childGender);
    }

    // Remarriage: this person (not their just-placed partner) may start a
    // SECOND partnership with a brand new spouse, with its own children —
    // exercises the same branch-widths-side-by-side path a second time.
    if (partnerId && rng() < remarriageProbability) {
      growDescendants(personId, personGender);
    }
  }

  // Grows personId's own recorded parents upward (growBranch("up")'s own
  // territory): a parent pair (or solo parent), that pair's OWN other
  // children (uncles/aunts — a sibling row, each possibly with their own
  // spouse/descendants, grown via the SAME growDescendants path any
  // ordinary child uses), recursing further up to grandparents. Stops at
  // maxAncestorGenerations (mirrors randomChildCount's own runaway-recursion
  // cap) — an unbounded ancestor chain would let a single seed's ancestor
  // depth grow without limit, unlike the downward side which is naturally
  // capped by personCount alone.
  function growAncestors(personId: string, generationsUp: number): void {
    if (generationsUp > maxAncestorGenerations) return;
    if (persons.length >= options.personCount) return;

    const isSoloParentLink = rng() < soloParentProbability;
    // The primary (first-recorded) parent's own gender is randomized
    // independently of personId's — shouldBeLeft (graph.ts) decides actual
    // left/right by gender, not by which one is "primary" here, so there's
    // no need to correlate it with the child's gender at all.
    const primaryParentGender: Gender = randomGender();
    const primaryParentId = makePerson(primaryParentGender);
    makeParentChild(primaryParentId, personId);

    let secondaryParentId: string | undefined;
    if (!isSoloParentLink && persons.length < options.personCount) {
      const secondaryGender: Gender =
        primaryParentGender === "male"
          ? "female"
          : primaryParentGender === "female"
            ? "male"
            : randomGender();
      secondaryParentId = makePerson(secondaryGender);
      makeParentChild(secondaryParentId, personId);
      makePartnership(primaryParentId, secondaryParentId);
    }

    // This ancestor pair's OWN other children (siblings of personId, from
    // the pulling-descendant's perspective — "uncles/aunts") — each grown
    // as an ORDINARY descendant branch (their own spouse/children), the
    // same growSiblingRow discovers on the real engine side.
    const siblingCount = randomAncestorSiblingCount();
    for (let i = 0; i < siblingCount; i++) {
      if (persons.length >= options.personCount) break;
      const siblingGender = randomGender();
      const siblingId = makePerson(siblingGender);
      makeParentChild(primaryParentId, siblingId);
      if (secondaryParentId) makeParentChild(secondaryParentId, siblingId);
      growDescendants(siblingId, siblingGender);
    }

    // Recurse further up from the primary parent (mirrors growPersonBranchUp's
    // own primaryParentId-first recursion) — the secondary parent's own
    // ancestry is deliberately NOT also grown here (real fixtures don't
    // always have both sides recorded arbitrarily deep either, and doubling
    // the branching factor every generation would runaway personCount much
    // faster than maxAncestorGenerations alone controls for).
    growAncestors(primaryParentId, generationsUp + 1);
  }

  const rootGender = randomGender();
  const rootId = makePerson(rootGender);
  growDescendants(rootId, rootGender);
  if (direction === "up") {
    growAncestors(rootId, 1);
  }

  return { graph: { persons, relationships }, focusPersonId: rootId };
}
