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
 * Stage 1 (see rewrite plan §7) only exercises the DOWN direction — every
 * generated graph is a pure descendant tree from a single root couple, no
 * ancestors above the root and no in-law side-branches. Ancestor generation
 * lands in a later stage once growBranch("up") replaces placeAncestors.
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
 * Generates a random descendant-only FamilyGraph rooted at a single couple
 * (or solo person). Returns the graph plus the id to use as focusPersonId —
 * always the root, so buildTreeLayout grows the WHOLE generated graph
 * downward from a single fixed origin, matching Stage 1's "down only" scope.
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

  const rootGender = randomGender();
  const rootId = makePerson(rootGender);
  growDescendants(rootId, rootGender);

  return { graph: { persons, relationships }, focusPersonId: rootId };
}
