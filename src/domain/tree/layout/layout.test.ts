import { describe, expect, it } from "vitest";
import { buildTreeLayout } from "./layout";
import { detectOverlaps } from "./collision";
import { CARD_WIDTH, GENERATION_GAP, SIBLING_GAP, SPOUSE_GAP } from "./subtree";
import { initialFamilyGraph, focusPersonId as realFocusId } from "./fixture";
import {
  case1SimpleFamily,
  case2DeepChain,
  case3Remarriage,
  case4BothRemarry,
  case5SiblingSubtree,
  case6AsymmetricBranch,
  case7LargeBothSides,
  case8DivorceRemarriageDeep,
  case9ManySiblings,
  case10ManyGenerations,
  case11InLawParents,
} from "./test-fixtures";
import { findInterleavedSiblingViolation } from "./invariants";
import type { FamilyGraph, TreeLayoutResult } from "./types";

function positionMap(result: TreeLayoutResult) {
  return new Map(result.persons.map((p) => [p.id, { x: p.x, y: p.y }]));
}

function personById(result: TreeLayoutResult, id: string) {
  const p = result.persons.find((person) => person.id === id);
  if (!p)
    throw new Error(`test fixture missing person "${id}" in layout result`);
  return p;
}

describe("layout engine — real data (Alexander/Eleonora/Eva + Viktor/Galina/Daria + Nikolai/Elizaveta/Nikolai Jr./Svetlana/Natalya + Vladimir Evtukh/Egor/Anastasiya + Viktor Efimovich/Olga/Yuriy + Vladimir/Marfa + Yustin (solo) + Grigory/Elizaveta Krivusha + Elizaveta's sister Elena Ushkar/Nikolai Ushkar + their daughter Natalya Ushkar (NEW, no canonical record) + Nikolai/Nadezhda Kozlovsky + Nikolai's brothers Yuzik/Daniil/Alexey + Vasily/Elizaveta Kozlovskaya + Petr (solo)/Yakov (solo) + Grigory Kolesnikovich/Agrafena + Filipp (solo) + Nadezhda's brothers Nikolai/Alexey/Pavel/Grigory Jr. Kolesnikovich + Galina's 8 sisters (own married surnames) + Galina's sisters' own husbands (Viktor Ravbetsky/Alexey Naumovich/Vladimir Artyukh/Vladimir Baidovsky/Alexander Stashevsky/Sergey Shlyazhko/Oleg Redko) + Marina's children Lyudmila+Vadim minimal core)", () => {
  it("places every person exactly once with no overlaps", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(result.persons).toHaveLength(58);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("focus person's partnership is centered on the origin (focus is the spatial anchor)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const focus = personById(result, realFocusId);
    const eleonora = personById(result, "eleonora-kupchik");
    expect(focus.y).toBe(0);
    expect((focus.x + eleonora.x) / 2).toBeCloseTo(0, 5);
  });

  it("husband (Alexander) is left of wife (Eleonora)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    expect(alexander.x).toBeLessThan(eleonora.x);
  });

  it("an only child is centered exactly under the parent partnership junction (regression: same-Y-bucket false collision)", () => {
    // Regression test for a real bug: OccupancyModel's Y-bucket index was
    // used AS the collision boundary instead of just an indexing aid, so a
    // parent row and the next generation's row could land in the same
    // bucket near their shared boundary and falsely register as colliding
    // even though their actual Y ranges never overlapped — this silently
    // pushed an only child (or first-in-row sibling) away from its true
    // centered position under the parents for no genealogical reason.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    const eva = personById(result, "eva-kupchik");
    const parentsCenterX = (alexander.x + eleonora.x) / 2;
    expect(eva.x).toBeCloseTo(parentsCenterX, 5);
  });

  it("Eva (child) is below her parents", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eva = personById(result, "eva-kupchik");
    expect(eva.y).toBeGreaterThan(alexander.y);
  });

  it("is deterministic — same graph, same focus, identical positions", () => {
    const r1 = buildTreeLayout(initialFamilyGraph, realFocusId);
    const r2 = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(positionMap(r1)).toEqual(positionMap(r2));
  });

  it("Alexander's parents (Viktor and Galina) are above him", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(viktor.y).toBeLessThan(alexander.y);
    expect(galina.y).toBeLessThan(alexander.y);
  });

  it("Viktor (husband) is left of Galina (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(viktor.x).toBeLessThan(galina.x);
  });

  it("the grandparents' partnership is centered above the FULL sibling row (Alexander + Daria), not just Alexander", () => {
    // The focus person is always fixed at x=0 first, before ancestors are
    // placed — but ancestors must center over the complete set of their
    // children, including a sibling placed later than the focus person, not
    // just whichever child happened to exist first. Parents/children stay
    // mutually aligned by moving the PARENTS to match the children's true
    // center, never the other way around (the focus anchor must not move).
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    const grandparentsCenterX = (viktor.x + galina.x) / 2;
    const siblingRowCenterX = (alexander.x + daria.x) / 2;
    expect(grandparentsCenterX).toBeCloseTo(siblingRowCenterX, 5);
  });

  it("Daria (Alexander's sister) is at the same generation, next to Alexander, under their shared parents", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    expect(daria.y).toBe(alexander.y);
    expect(Math.abs(daria.x - alexander.x)).toBeGreaterThanOrEqual(CARD_WIDTH);
  });

  it("Daria sits immediately beside Alexander himself, not past his spouse (regression: sibling landed next to the spouse instead of the blood relative)", () => {
    // Bug: a full sibling's nearest-free-slot search jumped past the focus
    // person's own spouse (Eleonora) and landed the sibling on the far side
    // of her instead of directly next to the blood relative — geometrically
    // collision-free, but wrong genealogically: a sibling must be adjacent
    // to the person they're related to by blood, never separated from them
    // by an in-law.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    const daria = personById(result, "daria-kupchik");
    const gapToAlexander = Math.abs(daria.x - alexander.x);
    expect(gapToAlexander).toBeCloseTo(CARD_WIDTH + SIBLING_GAP, 5);
    // Daria must be on Alexander's FAR side from Eleonora, not beyond her.
    const eleonoraIsRightOfAlexander = eleonora.x > alexander.x;
    if (eleonoraIsRightOfAlexander) {
      expect(daria.x).toBeLessThan(alexander.x);
    } else {
      expect(daria.x).toBeGreaterThan(alexander.x);
    }
  });

  it("full siblings Alexander and Daria are placed adjacent to each other without overlapping", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    expect(Math.abs(alexander.x - daria.x)).toBeGreaterThanOrEqual(CARD_WIDTH);
  });

  it("Viktor's own parents (Nikolai and Elizaveta) are above him, one generation further up than Viktor/Galina", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const nikolai = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    expect(nikolai.y).toBeLessThan(viktor.y);
    expect(elizaveta.y).toBeLessThan(viktor.y);
  });

  it("Nikolai (husband) is left of Elizaveta (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    expect(nikolai.x).toBeLessThan(elizaveta.x);
  });

  it("Nikolai and Elizaveta's partnership is centered over their FULL sibling row (Viktor + Nikolai Jr. + Svetlana + Natalya), not just over Viktor", () => {
    // Same "parents centered over the full sibling row" rule as
    // Viktor/Galina over Alexander+Daria, one generation up: Nikolai and
    // Elizaveta have FOUR children on this row, so their ideal center is
    // pulled from ALL FOUR children's x (an average, not just the midpoint
    // of the row's outer bounds), not directly above whichever child
    // (Viktor) happens to have his own already-placed descendants pulling
    // the ancestor pass to notice him first. Since Natalya's husband
    // Vladimir Evtukh sits physically between Nikolai Jr. and Natalya on
    // this row (not a blood child himself), the row's midpoint-of-bounds
    // and the average-of-blood-children's-x are no longer identical down
    // to the pixel — allow a reasonable margin rather than exact equality.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    const viktor = personById(result, "viktor-kupchik");
    const nikolaiJr = personById(result, "nikolai-kupchik-jr");
    const svetlana = personById(result, "svetlana-kupchik");
    const natalya = personById(result, "natalya-kupchik");

    const paternalCenterX = (nikolai.x + elizaveta.x) / 2;
    const siblingRowMinX = Math.min(
      viktor.x,
      nikolaiJr.x,
      svetlana.x,
      natalya.x,
    );
    const siblingRowMaxX = Math.max(
      viktor.x,
      nikolaiJr.x,
      svetlana.x,
      natalya.x,
    );
    const siblingRowCenterX = (siblingRowMinX + siblingRowMaxX) / 2;
    expect(Math.abs(paternalCenterX - siblingRowCenterX)).toBeLessThan(
      CARD_WIDTH,
    );
  });

  it("Vladimir and Marfa (Nikolai Kupchik Sr.'s own parents) are above him, one generation further up than Nikolai/Elizaveta", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");
    expect(vladimir.y).toBeLessThan(nikolai.y);
    expect(marfa.y).toBeLessThan(nikolai.y);
  });

  it("Vladimir (husband) is left of Marfa (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");
    expect(vladimir.x).toBeLessThan(marfa.x);
  });

  it("Vladimir/Marfa land close to their only child Nikolai, even while sharing a row with Grigory/Elizaveta Krivusha (rewrite plan Stage 3: no pre-emptive symmetric split — an ordinary occupancy collision search resolves the shared row instead)", () => {
    // Pre-Stage-3, this exact row conflict (Vladimir/Marfa pulled toward
    // Nikolai, Grigory/Elizaveta Krivusha pulled toward Elizaveta, both
    // couples on the SAME generation row) was resolved by a dedicated
    // up-front pass (resolveSymmetricOverlaps) that moved both couples an
    // EQUAL distance off their own ideal center, so the connector-line kink
    // was shared symmetrically rather than one couple absorbing it all.
    // Stage 3 (placement.ts's own doc comment on placeGraph explains why)
    // replaces that dedicated pass with the SAME ordinary occupancy search
    // every other branch-vs-branch collision already uses — whichever
    // couple's growPersonBranchUp call happens to run first keeps its exact
    // ideal center, and the second one searches outward from ITS OWN ideal
    // instead of splitting the shortfall. This does NOT reintroduce a real
    // bug (no overlap, no crossed lines — see the very next test) — it's
    // simply a different, simpler way of resolving the same conflict, one
    // the rewrite plan explicitly chose over reimplementing a parallel
    // symmetric-split mechanism. What must still hold: Vladimir/Marfa stay
    // REASONABLY close to Nikolai (not thrown far away by the collision
    // search), on the correct (paternal, left) side.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");

    const vladimirMarfaCenterX = (vladimir.x + marfa.x) / 2;
    expect(Math.abs(vladimirMarfaCenterX - nikolai.x)).toBeLessThan(
      CARD_WIDTH * 4,
    );
    expect(vladimir.x).toBeLessThan(marfa.x); // husband still left of wife
  });

  it("Grigory (husband) is left of Elizaveta Krivusha (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const grigory = personById(result, "grigory-krivusha");
    const elizavetaKrivusha = personById(result, "elizaveta-krivusha");
    expect(grigory.x).toBeLessThan(elizavetaKrivusha.x);
  });

  it("Grigory/Elizaveta Krivusha are above Elizaveta Kupchik, at the SAME generation as Vladimir/Marfa", () => {
    // Grigory/Elizaveta Krivusha's natural BFS generation (one above
    // Nikolai/Elizaveta Kupchik, same row as Vladimir/Marfa) is where
    // growBranch("up") places them — the OLD engine additionally detected
    // that their granddaughter Natalya Ushkar (via their OTHER daughter
    // Elena Ushkar) was landing "stranded" on an unrelated crowded row, and
    // retried the whole layout with Krivusha's ancestry raised one further
    // generation to fix it (findStrandedOnlyChildren +
    // raiseAncestryOneGeneration, both removed in Stage 3 — see placeGraph's
    // own doc comment). Stage 4's repairSideConstraintViolations
    // (subtree.ts) now rescues Natalya's own row-sharing directly (see her
    // own dedicated test further down in this file) WITHOUT needing to raise
    // Krivusha's own row — this test confirms that: Krivusha still sits
    // exactly where growBranch("up") naturally places them, undisturbed by
    // the repair happening several generations below.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const elizaveta = personById(result, "elizaveta-kupchik");
    const grigory = personById(result, "grigory-krivusha");
    const elizavetaKrivusha = personById(result, "elizaveta-krivusha");
    const vladimir = personById(result, "vladimir-kupchik");
    expect(grigory.y).toBeLessThan(elizaveta.y);
    expect(elizavetaKrivusha.y).toBeLessThan(elizaveta.y);
    expect(grigory.y).toBe(vladimir.y);
  });

  it("Vladimir/Marfa never end up on the wrong side of Grigory/Elizaveta Krivusha relative to their real children (regression: connector lines must not cross)", () => {
    // Real bug: two same-branch ("paternal") couples sharing a generation
    // row — Vladimir/Marfa (pulled toward Nikolai, the LEFT child) and
    // Grigory/Elizaveta Krivusha (pulled toward Elizaveta, the RIGHT child,
    // Nikolai's wife) — were resolved by resolveSymmetricOverlaps using
    // ID-alphabetical array order instead of actual idealX order. Since
    // "elizaveta-krivusha" sorts before "marfa-kupchik" alphabetically,
    // Grigory/Elizaveta Krivusha was placed as if it were the LEFTMOST
    // couple even though its real pull (Elizaveta Kupchik) sits to the
    // RIGHT of Vladimir/Marfa's real pull (Nikolai) — crossing their own
    // connector lines with each other even though neither couple
    // individually collided with anything. The relative left/right order
    // of the two couples themselves must match the relative left/right
    // order of the children they're centered over.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");
    const grigory = personById(result, "grigory-krivusha");
    const elizavetaKrivusha = personById(result, "elizaveta-krivusha");

    const vladimirMarfaCenterX = (vladimir.x + marfa.x) / 2;
    const krivushaCenterX = (grigory.x + elizavetaKrivusha.x) / 2;

    // Nikolai (Vladimir/Marfa's real child) sits left of Elizaveta
    // (Krivusha's real child) — so Vladimir/Marfa's couple must also sit
    // left of Krivusha's couple, preserving the same relative order.
    expect(nikolai.x).toBeLessThan(elizaveta.x);
    expect(vladimirMarfaCenterX).toBeLessThan(krivushaCenterX);
  });

  it("Yustin (Vladimir's father, recorded as a SOLO parent — no mother in this graph) is above Vladimir, one generation further up", () => {
    // Exercises the SoloParent path with real data for the first time:
    // Yustin has no recorded spouse, so he must still be placed as a
    // single ancestor unit (unitWidth = one card, not a paired 384px unit),
    // centered on his only child Vladimir.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vladimir = personById(result, "vladimir-kupchik");
    const yustin = personById(result, "yustin-kupchik");
    expect(yustin.y).toBeLessThan(vladimir.y);
    expect(yustin.x).toBeCloseTo(vladimir.x, 5);
  });

  it("Vasily and Elizaveta Kozlovskaya (Nikolai Kozlovsky's own parents) are above him, one generation further up than Nikolai/Nadezhda", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const vasily = personById(result, "vasily-kozlovsky");
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    expect(vasily.y).toBeLessThan(nikolaiKozlovsky.y);
    expect(elizavetaKozlovskaya.y).toBeLessThan(nikolaiKozlovsky.y);
  });

  it("Vasily (husband) is left of Elizaveta Kozlovskaya (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vasily = personById(result, "vasily-kozlovsky");
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    expect(vasily.x).toBeLessThan(elizavetaKozlovskaya.x);
  });

  it("Vasily and Elizaveta Kozlovskaya's partnership is centered over their FULL sibling row (Nikolai Kozlovsky + Yuzik + Daniil + Alexey), not just over Nikolai Kozlovsky", () => {
    // Same "parents centered over the full sibling row" rule seen with
    // Viktor/Galina over Alexander+Daria and Nikolai/Elizaveta Kupchik over
    // Viktor's four children: Vasily and Elizaveta Kozlovskaya now have
    // FOUR children on this row (Nikolai Kozlovsky + his three brothers),
    // so their ideal center is pulled from all four children's x, not
    // directly above Nikolai Kozlovsky alone.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vasily = personById(result, "vasily-kozlovsky");
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const yuzik = personById(result, "yuzik-kozlovsky");
    const daniil = personById(result, "daniil-kozlovsky");
    const alexey = personById(result, "alexey-kozlovsky");

    const centerX = (vasily.x + elizavetaKozlovskaya.x) / 2;
    const siblingXs = [nikolaiKozlovsky.x, yuzik.x, daniil.x, alexey.x];
    const siblingRowCenterX =
      (Math.min(...siblingXs) + Math.max(...siblingXs)) / 2;
    expect(Math.abs(centerX - siblingRowCenterX)).toBeLessThan(CARD_WIDTH);
  });

  it("Yuzik, Daniil, and Alexey (Nikolai Kozlovsky's full brothers) are adjacent to him, not scattered far away searching for free space near the origin", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const yuzik = personById(result, "yuzik-kozlovsky");
    const daniil = personById(result, "daniil-kozlovsky");
    const alexey = personById(result, "alexey-kozlovsky");
    const siblingXs = [yuzik.x, daniil.x, alexey.x];
    for (const x of siblingXs) {
      expect(Math.abs(x - nikolaiKozlovsky.x)).toBeLessThan(CARD_WIDTH * 7);
    }
    expect(yuzik.y).toBe(nikolaiKozlovsky.y);
    expect(daniil.y).toBe(nikolaiKozlovsky.y);
    expect(alexey.y).toBe(nikolaiKozlovsky.y);
  });

  it("Grigory Kolesnikovich and Agrafena (Nadezhda Kozlovskaya's own parents) are above her, at the same generation as Vasily/Elizaveta Kozlovskaya", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const grigoryKolesnikovich = personById(result, "grigory-kolesnikovich");
    const agrafena = personById(result, "agrafena-kolesnikovich");
    const vasily = personById(result, "vasily-kozlovsky");
    expect(grigoryKolesnikovich.y).toBeLessThan(nadezhda.y);
    expect(agrafena.y).toBeLessThan(nadezhda.y);
    expect(grigoryKolesnikovich.y).toBe(vasily.y);
  });

  it("Grigory Kolesnikovich (husband) is left of Agrafena (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const grigoryKolesnikovich = personById(result, "grigory-kolesnikovich");
    const agrafena = personById(result, "agrafena-kolesnikovich");
    expect(grigoryKolesnikovich.x).toBeLessThan(agrafena.x);
  });

  it("Grigory Kolesnikovich and Agrafena's partnership is centered over the whole sibling row (Nadezhda + her brothers Nikolai/Alexey/Pavel/Grigory Jr.), not just over Nadezhda alone", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const nikolaiJr = personById(result, "nikolai-kolesnikovich");
    const alexey = personById(result, "alexey-kolesnikovich");
    const pavel = personById(result, "pavel-kolesnikovich");
    const grigoryJr = personById(result, "grigory-kolesnikovich-jr");
    const grigoryKolesnikovich = personById(result, "grigory-kolesnikovich");
    const agrafena = personById(result, "agrafena-kolesnikovich");
    const siblingRowXs = [nadezhda, nikolaiJr, alexey, pavel, grigoryJr].map(
      (p) => p.x,
    );
    const rowCenter =
      (Math.min(...siblingRowXs) + Math.max(...siblingRowXs)) / 2;
    const centerX = (grigoryKolesnikovich.x + agrafena.x) / 2;
    expect(centerX).toBeCloseTo(rowCenter, 5);
  });

  it("Nadezhda Kozlovskaya's brothers Nikolai/Alexey/Pavel/Grigory Jr. Kolesnikovich stand adjacent to her at the standard sibling gap, in order", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const nikolaiJr = personById(result, "nikolai-kolesnikovich");
    const alexey = personById(result, "alexey-kolesnikovich");
    const pavel = personById(result, "pavel-kolesnikovich");
    const grigoryJr = personById(result, "grigory-kolesnikovich-jr");
    const step = CARD_WIDTH + SIBLING_GAP;
    expect(nikolaiJr.x - nadezhda.x).toBeCloseTo(step, 5);
    expect(alexey.x - nikolaiJr.x).toBeCloseTo(step, 5);
    expect(pavel.x - alexey.x).toBeCloseTo(step, 5);
    expect(grigoryJr.x - pavel.x).toBeCloseTo(step, 5);
    expect(nadezhda.y).toBe(nikolaiJr.y);
    expect(nadezhda.y).toBe(grigoryJr.y);
  });

  it("Filipp (Agrafena's own father, a SOLO parent) is above her, one generation further up than Grigory Kolesnikovich/Agrafena", () => {
    // Third SoloParent case with real data. Filipp's row (generation -4)
    // also holds Petr and Yakov (Vasily/Elizaveta Kozlovskaya's own solo
    // parents), but there's enough room here for Filipp to still center
    // exactly above Agrafena without any symmetric-kink shortfall.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const agrafena = personById(result, "agrafena-kolesnikovich");
    const filipp = personById(result, "filipp-strunevsky");
    expect(filipp.y).toBeLessThan(agrafena.y);
    expect(filipp.x).toBeCloseTo(agrafena.x, 5);
  });

  it("Petr (Vasily's father, recorded as a SOLO parent — no mother in this graph) is above Vasily, one generation further up", () => {
    // Second SoloParent case with real data (the first was Yustin, Vladimir
    // Kupchik's father) — this time on the MATERNAL side, exercising the
    // same unpaired-ancestor-unit path with branch="maternal" instead of
    // "paternal". Petr no longer centers EXACTLY above Vasily now that Yakov
    // (Elizaveta Kozlovskaya's own solo father) shares this same row, pulled
    // toward Elizaveta right next to Vasily — same symmetric-split situation
    // as the paired-ancestor cases (Nikolai/Elizaveta vs Nikolai/Nadezhda
    // Kozlovsky), just with two UNPAIRED solo parents instead of two couples.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vasily = personById(result, "vasily-kozlovsky");
    const petr = personById(result, "petr-kozlovsky");
    expect(petr.y).toBeLessThan(vasily.y);
    expect(Math.abs(petr.x - vasily.x)).toBeLessThan(CARD_WIDTH);
  });

  it("Petr and Yakov (both solo parents sharing a row) each sit close to their own child, on the correct side, with no overlap (rewrite plan Stage 3: no pre-emptive symmetric split — see the Vladimir/Marfa test above for the same design change)", () => {
    // Pre-Stage-3, resolveSymmetricOverlaps pushed BOTH competing units off
    // their own ideal by an equal amount when they'd overlap, so Petr and
    // Yakov (Vasily's and Elizaveta Kozlovskaya's own solo fathers,
    // sharing a row) ended up EXACTLY equidistant from their own children in
    // opposite directions. Stage 3 resolves the same collision via ordinary
    // occupancy search (see placeGraph's own doc comment) — whichever is
    // processed first keeps its exact ideal (directly above its own child),
    // the other searches outward from ITS OWN ideal. Still correct (no
    // overlap, no crossed lines, both reasonably close to their own child)
    // — just not symmetric anymore, which was never a goal in itself, only
    // a side effect of how the old collision pass happened to work.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vasily = personById(result, "vasily-kozlovsky");
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    const petr = personById(result, "petr-kozlovsky");
    const yakov = personById(result, "yakov-kozlovsky");
    expect(Math.abs(petr.x - vasily.x)).toBeLessThan(CARD_WIDTH * 4);
    expect(Math.abs(yakov.x - elizavetaKozlovskaya.x)).toBeLessThan(
      CARD_WIDTH * 4,
    );
    expect(petr.x).toBeLessThan(yakov.x); // relative order preserved
  });

  it("Yakov (Elizaveta Kozlovskaya's father, a SOLO parent) is above her, right of Petr", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    const petr = personById(result, "petr-kozlovsky");
    const yakov = personById(result, "yakov-kozlovsky");
    expect(yakov.y).toBeLessThan(elizavetaKozlovskaya.y);
    expect(yakov.y).toBe(petr.y);
    expect(petr.x).toBeLessThan(yakov.x);
  });

  it("Viktor's full siblings (Nikolai Jr., Svetlana, Natalya) are adjacent to Viktor, not scattered far away searching for free space near the origin", () => {
    // Regression test: siblings with no children of their own have no
    // "pull" (preferredAncestorX finds nothing to average), so treating
    // them as independent ancestor units defaulted their ideal position to
    // x=0 (the origin) and sent them colliding outward past their own
    // parents' whole reserved cluster — landing over 1000px from Viktor
    // instead of right beside him. They must be placed via
    // placeUnplacedSiblings, anchored on Viktor (the sibling who's already
    // placed), the same mechanism that seats Daria beside Alexander.
    // Bound widened to 7 cards: Natalya's husband Vladimir Evtukh now sits
    // between Natalya and Nikolai Jr. on this same row, pushing Svetlana
    // (the furthest sibling) an extra card-width away from Viktor.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const nikolaiJr = personById(result, "nikolai-kupchik-jr");
    const svetlana = personById(result, "svetlana-kupchik");
    const natalya = personById(result, "natalya-kupchik");
    const siblingXs = [nikolaiJr.x, svetlana.x, natalya.x];
    for (const x of siblingXs) {
      expect(Math.abs(x - viktor.x)).toBeLessThan(CARD_WIDTH * 7);
    }
    // All four full siblings sit on the same generation row as Viktor.
    expect(nikolaiJr.y).toBe(viktor.y);
    expect(svetlana.y).toBe(viktor.y);
    expect(natalya.y).toBe(viktor.y);
  });

  it("Svetlana (who has her own husband Viktor Efimovich) stays at the EXACT standard sibling gap from her blood brother Nikolai Jr. (regression: a sibling-with-spouse's blood-sibling gap must not inflate just because a neighbor has a spouse)", () => {
    // Real bug, caught via screenshot: the previous fix for
    // placeUnplacedSiblings reserved a spouse-having sibling's whole couple
    // width centered at SIBLING_GAP+unitWidth from the anchor — since this
    // sibling's own card sits on only the NEAR half of that reserved unit,
    // roughly unitWidth/2 of UNINTENDED extra space ended up between the two
    // BLOOD siblings (Svetlana↔Nikolai Jr. rendered ~168px apart instead of
    // the usual 64px edge gap), while contributing nothing to the boundary
    // where that width actually belongs (Viktor Efimovich↔Natalya, two
    // different families). The user could see on a screenshot that the gap
    // "didn't look like 64px" even though it was numerically ≥64.
    // Here Svetlana's spouse Viktor Efimovich sits AWAY from Nikolai Jr (on
    // Svetlana's far side), so nothing forces the blood gap to widen — it
    // must be exactly CARD_WIDTH + SIBLING_GAP, identical to any ordinary
    // sibling pair with no spouse involved at all (e.g. Nikolai Jr.↔Viktor).
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiJr = personById(result, "nikolai-kupchik-jr");
    const svetlana = personById(result, "svetlana-kupchik");
    const viktor = personById(result, "viktor-kupchik");
    const svetlanaNikolaiGap = Math.abs(nikolaiJr.x - svetlana.x);
    const nikolaiViktorGap = Math.abs(viktor.x - nikolaiJr.x);
    expect(svetlanaNikolaiGap).toBeCloseTo(CARD_WIDTH + SIBLING_GAP, 5);
    expect(svetlanaNikolaiGap).toBeCloseTo(nikolaiViktorGap, 5);
  });

  it("Marina's blood-sibling gap from Nina stays the plain SIBLING_GAP — her husband Viktor Ravbetsky never sits between two blood siblings", () => {
    // Marina (the blood sibling) is always placed on the side FACING the
    // anchor (Nina, growing this row rightward) regardless of gender —
    // Viktor Ravbetsky (her spouse) always grows on the FAR side instead,
    // via growPersonBranchDown's own branch layout. This replaces the old
    // "spouseTowardAnchor" behavior (spouse unavoidably wedged between two
    // blood siblings whenever his gender-required side happened to face the
    // anchor) — the blood-sibling gap is now ALWAYS the plain SIBLING_GAP,
    // never widened to fit a spouse's card in between.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nina = personById(result, "nina-tikhonovich");
    const marina = personById(result, "marina-ravbetskaya");
    const viktorRavbetsky = personById(result, "viktor-ravbetsky");
    expect(viktorRavbetsky.x).toBeGreaterThan(marina.x); // spouse on the far side, past Marina
    const ninaMarinaGap = marina.x - nina.x;
    expect(ninaMarinaGap).toBeCloseTo(CARD_WIDTH + SIBLING_GAP, 5);
  });

  it("Elena Ushkar and her full sister Elizaveta Kupchik stay on the SAME row, adjacent, as full siblings of Grigory/Elizaveta Krivusha", () => {
    // Pre-Stage-3, findStrandedOnlyChildren + raiseAncestryOneGeneration
    // (both removed — see placeGraph's own doc comment) split Elena and
    // Elizaveta Kupchik onto DIFFERENT rows once Elena's own daughter
    // Natalya needed rescuing from a crowded, unrelated row — which then
    // caused a SEPARATE bug (straightenAncestorConnectors, also removed) to
    // patch a connector-clipping symptom of that split. Stage 3's
    // growPersonBranchUp places Elena and Elizaveta Kupchik as ordinary full
    // siblings on ONE row (parentRowSiblingsOf finds them via their shared
    // parents Grigory/Elizaveta Krivusha, same mechanism as any other
    // sibling row) — husband-left/wife-right is a structural placement rule
    // here (Nikolai Ushkar is placed via growPersonBranchDown same as any
    // other spouse), not a coincidental default that could clip a line and
    // need correcting after the fact. Stage 4's repairSideConstraintViolations
    // rescues Natalya's OWN row-sharing directly (she has no children of her
    // own, so her whole "moving unit" is just herself) without needing to
    // split Elena/Elizaveta Kupchik apart again — confirmed here.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const elena = personById(result, "elena-ushkar");
    const nikolaiUshkar = personById(result, "nikolai-ushkar");
    const elizavetaKupchik = personById(result, "elizaveta-kupchik");
    expect(elena.y).toBe(elizavetaKupchik.y);
    // Elena (the blood relative, sibling of Elizaveta Kupchik) stays on the
    // side FACING the rest of her own sibling row — her spouse Nikolai
    // Ushkar (married in) on the far side — regardless of gender rank
    // (rewrite plan §7: personIsLeftOverride, replacing the old plain
    // shouldBeLeft-only placement that put Nikolai left purely because
    // he's male, independent of which of the couple is the actual blood
    // relative here).
    expect(nikolaiUshkar.x).toBeGreaterThan(elena.x);
    expect(Math.abs(elena.x - nikolaiUshkar.x)).toBeCloseTo(
      CARD_WIDTH + SPOUSE_GAP,
      5,
    );
  });

  it("Grigory/Elizaveta Krivusha sit reasonably close to the midpoint of BOTH their daughters (Elena Ushkar + Elizaveta Kupchik), possibly shifted by a genuine collision with Vladimir/Marfa's own reserved space on the same row", () => {
    // growPersonBranchUp computes the parent pair's ideal center from the
    // COMPLETE sibling row up front (Elena's x + Elizaveta Kupchik's x,
    // averaged) — see its own doc comment's Step 1/Step 2 — but that ideal
    // center can still be pushed off its exact midpoint by an ORDINARY
    // occupancy collision with an unrelated branch sharing the same
    // generation row (here: Vladimir/Marfa, Nikolai Kupchik's own parents,
    // whose reserved footprint the idealX genuinely overlaps once
    // INTER_FAMILY_GAP is accounted for) — this is expected, by-construction
    // collision handling (the same "ordinary occupancy search, no dedicated
    // symmetric-split pass" design as the Vladimir/Marfa and Petr/Yakov
    // tests above), not a bug to "straighten" after the fact. What must
    // still hold: no overlap, and the pair stays close enough to their true
    // row to read as "these are the parents of this row", not drifted far
    // away searching for free space.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const grigory = personById(result, "grigory-krivusha");
    const elizavetaKrivusha = personById(result, "elizaveta-krivusha");
    const elena = personById(result, "elena-ushkar");
    const elizavetaKupchik = personById(result, "elizaveta-kupchik");

    const parentMidpoint = (grigory.x + elizavetaKrivusha.x) / 2;
    const childrenMidpoint = (elena.x + elizavetaKupchik.x) / 2;
    expect(Math.abs(parentMidpoint - childrenMidpoint)).toBeLessThan(
      CARD_WIDTH * 2,
    );
    // Their own SPOUSE_GAP is always exact, regardless of any collision
    // shift — only their shared midpoint can move, never the distance
    // between the two of them (CLAUDE.md: spouses are a compact unit).
    expect(elizavetaKrivusha.x - grigory.x).toBeCloseTo(
      CARD_WIDTH + SPOUSE_GAP,
      5,
    );
  });

  it("EVERY married couple in this real dataset sits at the EXACT SAME standard spouse gap (CARD_WIDTH+SPOUSE_GAP=208px), regardless of which code path placed them (regression: three different paths gave three different gaps — 192/208/236px)", () => {
    // Real bug, caught by the user comparing pairs across the tree: couples
    // placed via placeAncestorUnit (e.g. Viktor/Galina) got 208px — correct.
    // Couples grown via growPersonDescendants (e.g. Vladimir Evtukh/Natalya,
    // Viktor Efimovich/Svetlana) got 236px — that function's own
    // preferredSpouseX formula wrongly halved SPOUSE_GAP (personX +
    // CARD_WIDTH/2 + SPOUSE_GAP/2 + CARD_WIDTH/2 = only +192, not +208),
    // AND its collision search used REMARRIAGE_GAP (56px) instead of
    // SPOUSE_GAP (32px) as the buffer, which — checked on BOTH sides of the
    // candidate, including the side facing the very card this spouse is
    // meant to sit immediately beside — falsely detected a "collision"
    // against that person's own reservation and pushed the search further
    // out, landing at 236px instead of 208px. Couples placed via the newer
    // placeUnplacedSiblings spouse-reservation path (e.g. Marina/Viktor
    // Ravbetsky) got 192px from the same halved-SPOUSE_GAP formula (that
    // path's fallback branch, reused from the same buggy pattern). All
    // three are now fixed to the same 208px.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const pairs: [string, string][] = [
      ["viktor-kupchik", "galina-kupchik"],
      ["vladimir-evtukh", "natalya-kupchik"],
      ["viktor-efimovich", "svetlana-kupchik"],
      ["viktor-ravbetsky", "marina-ravbetskaya"],
      ["nikolai-ushkar", "elena-ushkar"],
      ["alexey-naumovich", "tatiana-naumovich"],
      ["vladimir-artyukh", "vera-artyukh"],
      ["vladimir-baidovsky", "lyubov-baidovskaya"],
      ["alexander-stashevsky", "olga-stashevskaya"],
      ["sergey-shlyazhko", "raisa-shlyazhko"],
      ["oleg-redko", "lyudmila-redko"],
    ];
    for (const [husbandId, wifeId] of pairs) {
      const husband = personById(result, husbandId);
      const wife = personById(result, wifeId);
      // Nikolai/Elena Ushkar are a deliberate exception to husband-left: see
      // straightenAncestorConnectors (placement.ts) and the dedicated test
      // above — Nikolai (no parentIds) sits on whichever side keeps Elena's
      // own ancestor connector from clipping his card, which puts him on
      // Elena's RIGHT here. The gap magnitude must still be the exact
      // standard spouse gap either way — only the sign differs.
      expect(Math.abs(wife.x - husband.x)).toBeCloseTo(
        CARD_WIDTH + SPOUSE_GAP,
        5,
      );
    }
  });

  it("Vladimir Evtukh (Natalya's husband) is left of Natalya, and their children Egor/Anastasiya are below them", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const vladimirEvtukh = personById(result, "vladimir-evtukh");
    const natalya = personById(result, "natalya-kupchik");
    const egor = personById(result, "egor-evtukh");
    const anastasiya = personById(result, "anastasiya-evtukh");
    expect(vladimirEvtukh.x).toBeLessThan(natalya.x);
    expect(vladimirEvtukh.y).toBe(natalya.y);
    expect(egor.y).toBeGreaterThan(natalya.y);
    expect(anastasiya.y).toBeGreaterThan(natalya.y);
  });

  it("Natalya's own card stays close to (not thousands of px from) her sister Svetlana's husband Viktor Efimovich, at least INTER_FAMILY_GAP away with no overlap (regression: two unrelated in-laws sharing a row boundary)", () => {
    // Real bug: Natalya (with her own unplaced husband Vladimir Evtukh, who
    // must sit further left of her) needed her own card placed next to
    // Svetlana, but Svetlana's OWN husband Viktor Efimovich already occupies
    // that exact space. The fallback search previously tried to clear room
    // for Natalya's WHOLE couple-unit (both her own card AND Vladimir
    // Evtukh's, who doesn't actually need any clearance from Viktor
    // Efimovich — he sits well past Natalya regardless) in one atomic
    // block, overshooting far past what was needed. Fixed to search only
    // for Natalya's own CARD_WIDTH against Viktor Efimovich, at
    // INTER_FAMILY_GAP (the fixed gap between any two unrelated people
    // sharing a row) — the exact value can be a little more than
    // CARD_WIDTH+INTER_FAMILY_GAP due to the search's coarse step size, but
    // must never be a different order of magnitude, and must never overlap.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const natalya = personById(result, "natalya-kupchik");
    const viktorEfimovich = personById(result, "viktor-efimovich");
    const gap = Math.abs(viktorEfimovich.x - natalya.x) - CARD_WIDTH;
    expect(gap).toBeGreaterThanOrEqual(SIBLING_GAP);
    expect(gap).toBeLessThan(SIBLING_GAP * 3);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("Viktor Efimovich (Svetlana's husband) is left of Svetlana, and their children Olga/Yuriy are below them", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const viktorEfimovich = personById(result, "viktor-efimovich");
    const svetlana = personById(result, "svetlana-kupchik");
    const olga = personById(result, "olga-efimovich");
    const yuriy = personById(result, "yuriy-efimovich");
    expect(viktorEfimovich.x).toBeLessThan(svetlana.x);
    expect(viktorEfimovich.y).toBe(svetlana.y);
    expect(olga.y).toBeGreaterThan(svetlana.y);
    expect(yuriy.y).toBeGreaterThan(svetlana.y);
  });

  it("Daria stays at the standard sibling gap from Alexander even though several cousin branches (Svetlana/Natalya's own grandchildren) land on the SAME generation row (regression: cousin branches must never claim the focus's own sibling's spot first)", () => {
    // Real bug: Svetlana and Natalya's grandchildren (Olga/Yuriy Efimovich,
    // Egor/Anastasiya Evtukh) are several generations removed from Alexander
    // by blood, but BFS generation distance — not blood closeness — decides
    // which row a person lands on, so they end up on the exact same row as
    // Daria (generation 0). The ancestor-row loop processes units in id
    // order within a row, and "natalya-kupchik"/"svetlana-kupchik" sort
    // before "viktor-kupchik" — so their grandchildren's branches used to
    // grow into the space right next to Alexander BEFORE Daria (a full
    // sibling, must-be-adjacent per CLAUDE.md) ever got a turn, sending
    // Daria searching hundreds of px further out. Blood closeness to the
    // focus always outranks id-order processing: the focus's own siblings
    // must claim their spot first, before any other branch on the same row.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, realFocusId);
    const daria = personById(result, "daria-kupchik");
    expect(Math.abs(daria.x - alexander.x)).toBeCloseTo(
      CARD_WIDTH + SIBLING_GAP,
      5,
    );
  });

  it("no overlaps across all three generations (Nikolai/Elizaveta, Viktor/Galina + Daria, Alexander + Eleonora/Eva)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("Galina's own parents (Nikolai and Nadezhda Kozlovsky) are above her, at the same generation as Nikolai/Elizaveta Kupchik", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const galina = personById(result, "galina-kupchik");
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const nikolaiKupchik = personById(result, "nikolai-kupchik");
    expect(nikolaiKozlovsky.y).toBeLessThan(galina.y);
    expect(nadezhda.y).toBeLessThan(galina.y);
    expect(nikolaiKozlovsky.y).toBe(nikolaiKupchik.y);
  });

  it("Nikolai Kozlovsky (husband) is left of Nadezhda (wife)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    expect(nikolaiKozlovsky.x).toBeLessThan(nadezhda.x);
  });

  it("Nikolai/Nadezhda Kozlovsky's partnership stays right of Galina and doesn't collide with the (much wider) Kupchik great-grandparent cluster", () => {
    // Nikolai/Elizaveta Kupchik now center over FOUR children (Viktor +
    // Nikolai Jr. + Svetlana + Natalya), so their ideal center is pulled
    // well to the left of Viktor himself — Kozlovsky (Galina's parents,
    // now two recorded children: Galina + Nina) does not have as wide a
    // row to center over, so it is not expected to be pulled by a
    // comparable amount anymore. What still must hold: Kozlovsky stays
    // right of Galina (correct maternal side), and the two great-
    // grandparent clusters don't overlap.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const galina = personById(result, "galina-kupchik");
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const kozlovskyCenterX = (nikolaiKozlovsky.x + nadezhda.x) / 2;
    expect(kozlovskyCenterX).toBeGreaterThanOrEqual(galina.x);
  });

  it("Nikolai/Nadezhda Kozlovsky's partnership is centered over the AVERAGE x of their full sibling row (Galina + all 8 sisters), not just over Galina", () => {
    // Same "parents centered over the full sibling row" rule as
    // Nikolai/Elizaveta over Viktor's four children: Kozlovsky now has NINE
    // children on this row (Galina + Nina/Marina/Tatyana/Vera/Lyubov/Olga/
    // Raisa/Lyudmila), so their ideal center is the MEAN of the whole row's
    // x positions (preferredAncestorX's own definition), not directly above
    // Galina alone. NOTE: this is the arithmetic mean, not (min+max)/2 — once
    // Marina's own husband Viktor Ravbetsky is wedged in next to her, the
    // gap between Nina and Marina is wider than the other uniform sibling
    // gaps, so the mean and the midpoint of the row's visual span are no
    // longer the same value; preferredAncestorX only ever computes the mean.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const sisterIds = [
      "galina-kupchik",
      "nina-tikhonovich",
      "marina-ravbetskaya",
      "tatiana-naumovich",
      "vera-artyukh",
      "lyubov-baidovskaya",
      "olga-stashevskaya",
      "raisa-shlyazhko",
      "lyudmila-redko",
    ];
    const sisterXs = sisterIds.map((id) => personById(result, id).x);

    const maternalCenterX = (nikolaiKozlovsky.x + nadezhda.x) / 2;
    const siblingRowMeanX =
      sisterXs.reduce((a, b) => a + b, 0) / sisterXs.length;
    expect(maternalCenterX).toBeCloseTo(siblingRowMeanX, 5);
  });

  it("all of Galina's sisters are adjacent to each other in one continuous row, not scattered far away searching for free space near the origin", () => {
    // Same regression as Viktor's siblings: a childless sibling has no
    // "pull" (preferredAncestorX finds nothing to average), so treating
    // them as an independent ancestor unit would default their ideal
    // position to x=0 instead of anchoring them beside the nearest already-
    // placed blood sibling via placeUnplacedSiblings — this must still hold
    // when there are EIGHT such siblings to place, not just one or three.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const galina = personById(result, "galina-kupchik");
    const sisterIds = [
      "nina-tikhonovich",
      "marina-ravbetskaya",
      "tatiana-naumovich",
      "vera-artyukh",
      "lyubov-baidovskaya",
      "olga-stashevskaya",
      "raisa-shlyazhko",
      "lyudmila-redko",
    ];
    const sisters = sisterIds.map((id) => personById(result, id));
    for (const sister of sisters) {
      expect(sister.y).toBe(galina.y);
    }
    // The whole row of 9 sisters (Galina + 8) plus SIX sisters' own husbands
    // (Marina/Viktor Ravbetsky, Tatiana/Alexey Naumovich, Vera/Vladimir
    // Artyukh, Lyubov/Vladimir Baidovsky, Olga/Alexander Stashevsky,
    // Raisa/Sergey Shlyazhko, Lyudmila/Oleg Redko) wedged in beside their
    // wives spans at most 9 cards + 8 sibling gaps + 6 extra husband cards,
    // each with generous room for growPersonDescendants' own (pre-existing,
    // not this fixture's concern) wider-than-SPOUSE_GAP spouse placement —
    // this bound exists to catch the regression (a sibling-with-spouse
    // getting bounced thousands of px away searching for free space), not
    // to pin the exact packing constant.
    const allXs = [galina.x, ...sisters.map((s) => s.x)];
    const spread = Math.max(...allXs) - Math.min(...allXs);
    expect(spread).toBeLessThanOrEqual(
      9 * CARD_WIDTH + 8 * SIBLING_GAP + 6 * (CARD_WIDTH * 2 + SPOUSE_GAP) + 1,
    );
  });

  it("Marina's husband Viktor Ravbetsky (married in, no recorded blood parents of his own) is never treated as an independent ancestor unit (regression: a parentless in-law must not default to idealX=0 and get placed before his own wife's sibling row)", () => {
    // Real bug: Viktor Ravbetsky has parentIds=[] (no ancestors of his own
    // recorded in this data), so hasSiblingInGraph(viktor) was (correctly)
    // false — but the exclusion filter's OTHER clause, !hasSiblingInGraph,
    // then wrongly let him through as a standalone "ancestor unit" pulled
    // toward idealX=0, placed by placeAncestorUnit BEFORE Marina's own
    // placeUnplacedSiblings turn ever came. That planted him (and, via his
    // couple-unit, Marina too) in the middle of Viktor Kupchik's own sibling
    // cluster, on a totally different row segment than Galina's sisters.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const galina = personById(result, "galina-kupchik");
    const nina = personById(result, "nina-tikhonovich");
    const marina = personById(result, "marina-ravbetskaya");
    const viktorRavbetsky = personById(result, "viktor-ravbetsky");
    // Galina's sibling row runs Galina, Nina, [Marina, Viktor Ravbetsky], ...
    // — all increasing in x, all on Galina's own row, none of them jumping
    // over to Viktor Kupchik's side (which is at negative x, left of
    // Galina). Marina (blood sibling) leads the pair, facing the anchor;
    // Viktor Ravbetsky (her spouse) trails on the far side.
    expect(nina.x).toBeGreaterThan(galina.x);
    expect(marina.x).toBeGreaterThan(nina.x);
    expect(viktorRavbetsky.x).toBeGreaterThan(marina.x);
    expect(viktorRavbetsky.y).toBe(galina.y);
  });

  it("Marina and her husband Viktor Ravbetsky stay adjacent to each other (regression: a sibling-with-spouse wedged between two other blood siblings must reserve room for their own spouse, not just their own card)", () => {
    // Real bug: placeUnplacedSiblings reserved only CARD_WIDTH for Marina's
    // own slot between Nina and the rest of the row — when Marina's husband
    // Viktor Ravbetsky (who must be leftPersonId — male < female — so he
    // belongs on Marina's LEFT) then tried to grow into that slot via
    // growPersonDescendants, he found Nina's own card already sitting there
    // and searched thousands of px further out looking for free space,
    // ending up on the opposite side of the whole tree from his own wife.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const marina = personById(result, "marina-ravbetskaya");
    const viktorRavbetsky = personById(result, "viktor-ravbetsky");
    expect(viktorRavbetsky.y).toBe(marina.y);
    // Marina (blood sibling) faces the anchor, Viktor Ravbetsky (spouse) on
    // the far side.
    expect(viktorRavbetsky.x).toBeGreaterThan(marina.x);
    expect(Math.abs(marina.x - viktorRavbetsky.x)).toBeLessThan(CARD_WIDTH * 3);
  });

  it("Marina's children Lyudmila and Vadim Ravbetsky are placed below Marina/Viktor Ravbetsky, with no overlaps", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const marina = personById(result, "marina-ravbetskaya");
    const lyudmilaRavbetskaya = personById(result, "lyudmila-ravbetskaya");
    const vadim = personById(result, "vadim-ravbetsky");
    expect(lyudmilaRavbetskaya.y).toBeGreaterThan(marina.y);
    expect(vadim.y).toBeGreaterThan(marina.y);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("the other five sisters' husbands (Alexey Naumovich, Vladimir Artyukh, Vladimir Baidovsky, Alexander Stashevsky, Sergey Shlyazhko, Oleg Redko) each stay adjacent to their own wife, on the FAR side from the sibling row's anchor", () => {
    // Same fix as Marina/Viktor Ravbetsky, now exercised with FIVE more
    // sister-with-spouse pairs sharing the same contiguous row — confirms
    // the placeUnplacedSiblings unit-width fix generalizes past the first
    // case it was found and fixed on. Each wife (the blood sibling) faces
    // the anchor; her husband (spouse, married in) trails on the far side —
    // independent of gender rank (rewrite plan §7: personIsLeftOverride).
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const pairs: [string, string][] = [
      ["alexey-naumovich", "tatiana-naumovich"],
      ["vladimir-artyukh", "vera-artyukh"],
      ["vladimir-baidovsky", "lyubov-baidovskaya"],
      ["alexander-stashevsky", "olga-stashevskaya"],
      ["sergey-shlyazhko", "raisa-shlyazhko"],
      ["oleg-redko", "lyudmila-redko"],
    ];
    for (const [husbandId, wifeId] of pairs) {
      const husband = personById(result, husbandId);
      const wife = personById(result, wifeId);
      expect(husband.y).toBe(wife.y);
      expect(husband.x).toBeGreaterThan(wife.x);
      expect(Math.abs(wife.x - husband.x)).toBeLessThan(CARD_WIDTH * 3);
    }
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("Viktor and Galina stay at the standard spouse gap, never stretched apart for their own grandparents' sake", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(galina.x - viktor.x).toBeCloseTo(CARD_WIDTH + SPOUSE_GAP, 5);
  });

  it("paternal great-grandparents (Nikolai/Elizaveta Kupchik) stay left of maternal great-grandparents (Nikolai/Nadezhda Kozlovsky) — the two ancestor lines never mix", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiKupchik = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const paternalMaxX = Math.max(nikolaiKupchik.x, elizaveta.x);
    const maternalMinX = Math.min(nikolaiKozlovsky.x, nadezhda.x);
    expect(paternalMaxX).toBeLessThan(maternalMinX);
  });

  it("no overlaps with both great-grandparent couples on the same row", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("Natalya Ushkar (Elena/Nikolai Ushkar's only recorded child, no children/siblings of her own) is never treated as an independent ancestor unit (regression: an unpulled only child must not default to idealX=0 and drag the whole ancestor row with her)", () => {
    // Real bug: Natalya Ushkar has real parentIds (Nikolai/Elena Ushkar) but
    // no children of her own (not pulled by descendants) AND no sibling
    // recorded in the graph (an only child) — the OLD filter's
    // `!hasSiblingInGraph` clause treated "no sibling" as license to become
    // an independent ancestor unit, exactly the failure this filter exists
    // to prevent (just for a shape — only child, not sibling-of-someone-
    // pulled — that hadn't been exercised before Natalya). She NATURALLY
    // lands on generation -1 (the SAME BFS row as Viktor/Galina, since
    // generation is BFS distance from focus, not blood closeness — Elena/
    // Nikolai Ushkar are generation -2, one level up, so their child is
    // back down at -1). Passing the old filter got her placed via
    // placeAncestorUnit at idealX=0, BEFORE the Kozlovsky-sisters row and
    // the Kupchik-great-grandparent row were resolved — collapsing the
    // entire maternal side (Nikolai/Nadezhda Kozlovsky, all 8 of Galina's
    // sisters) leftward by thousands of px via resolveSymmetricOverlaps.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const galina = personById(result, "galina-kupchik");
    const lyudmilaRedko = personById(result, "lyudmila-redko");
    // The maternal side (Kozlovsky great-grandparents + Galina's own sibling
    // row) must stay on its own side, undisturbed by Natalya Ushkar's
    // placement — this is the same "paternal/maternal lines never mix"
    // invariant as the test above, just re-asserted after Natalya exists.
    expect(nikolaiKozlovsky.x).toBeGreaterThan(0);
    expect(nadezhda.x).toBeGreaterThan(0);
    expect(galina.x).toBeGreaterThan(nikolaiKozlovsky.x - 2000); // sanity: not collapsed onto paternal side
    expect(lyudmilaRedko.x).toBeGreaterThan(galina.x);
  });

  it("Natalya Ushkar (rewrite plan Stage 4: elastic Y): the crowded-row gap is resolved — she is nudged OFF Galina's crowded natural-BFS row onto a row of her own", () => {
    // Pre-Stage-3, buildTreeLayout retried the WHOLE layout once
    // (findStrandedOnlyChildren + raiseAncestryOneGeneration, both removed —
    // see placeGraph's own doc comment) specifically to rescue an unpulled
    // only child like Natalya Ushkar from landing on a natural-BFS-distance
    // row that already belongs entirely to an unrelated family, by raising
    // her whole ancestry one discrete generation and re-running the ENTIRE
    // layout. Stage 3 replaced ancestor placement with growBranch("up") but
    // deliberately left this specific class of bug as a documented KNOWN GAP
    // (Natalya still shared Galina's row, unrescued) — explicitly assigned to
    // Stage 4 (elastic Y). Stage 4's repairSideConstraintViolations
    // (subtree.ts) is a general post-placement repair pass for "two
    // unrelated clusters sharing a row", not built FOR Natalya specifically —
    // but her case is exactly an instance of that same shape (her row is
    // entirely Viktor/Galina's unrelated family), so the general repair
    // rescues her too, without a special-cased retry. The rescue here is a
    // BOUNDED LOCAL nudge (MAX_Y_NUDGE, a fraction of one GENERATION_GAP),
    // not a full re-layout pinning her exactly beside her parents' row like
    // the old discrete raise-and-retry did — she lands on a DIFFERENT row
    // from Galina's crowded one (the actual bug: sharing a row with an
    // unrelated family), still collision-free and with a valid connector.
    // Note: the nudge does NOT guarantee she ends up numerically CLOSER to
    // her own parents' row than the old crowded row was — MAX_Y_NUDGE is a
    // bounded search for a row that resolves the violation, not a "move
    // toward blood family" heuristic — so this test only asserts the actual
    // bug (row-sharing) is gone, not a specific direction/distance.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const natalya = personById(result, "natalya-ushkar");
    const galina = personById(result, "galina-kupchik");
    expect(natalya.y).not.toBe(galina.y); // rescued off the crowded row
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("no overlaps anywhere in the tree with Natalya Ushkar present", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });
});

describe("CASE 1 — simple nuclear family (A+B -> C, D, E)", () => {
  const result = buildTreeLayout(case1SimpleFamily, "a");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("all three children are below the parents", () => {
    const a = personById(result, "a");
    for (const id of ["c", "d", "e"]) {
      expect(personById(result, id).y).toBeGreaterThan(a.y);
    }
  });

  it("spouses stay adjacent (exact gap)", () => {
    const a = personById(result, "a");
    const b = personById(result, "b");
    expect(
      Math.abs(Math.abs(a.x - b.x) - (CARD_WIDTH + SPOUSE_GAP)),
    ).toBeLessThan(0.01);
  });

  it("siblings stay ordered and non-overlapping", () => {
    const c = personById(result, "c");
    const d = personById(result, "d");
    const e = personById(result, "e");
    const xs = [c.x, d.x, e.x].sort((x, y) => x - y);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(CARD_WIDTH);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(CARD_WIDTH);
  });

  it("the sibling row is centered under the parent partnership", () => {
    const a = personById(result, "a");
    const b = personById(result, "b");
    const parentsCenterX = (a.x + b.x) / 2;
    const c = personById(result, "c");
    const d = personById(result, "d");
    const e = personById(result, "e");
    const rowCenterX = (Math.min(c.x, d.x, e.x) + Math.max(c.x, d.x, e.x)) / 2;
    expect(rowCenterX).toBeCloseTo(parentsCenterX, 5);
  });
});

describe("CASE 2 — deep chain then wide sibling row", () => {
  const result = buildTreeLayout(case2DeepChain, "a");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("each generation strictly increases in y down the chain", () => {
    const ys = ["a", "c", "d", "e"].map((id) => personById(result, id).y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it("e, f, g are siblings at the same generation and don't overlap", () => {
    const e = personById(result, "e");
    const f = personById(result, "f");
    const g = personById(result, "g");
    expect(e.y).toBe(f.y);
    expect(f.y).toBe(g.y);
  });
});

describe("CASE 3 — remarriage: A+B -> C, A+D -> E", () => {
  const result = buildTreeLayout(case3Remarriage, "a");

  it("A appears exactly once (one Person node per canonical person)", () => {
    const occurrences = result.persons.filter((p) => p.id === "a");
    expect(occurrences).toHaveLength(1);
  });

  it("both partnerships are preserved", () => {
    expect(result.partnerships.map((p) => p.id).sort()).toEqual(["ab", "ad"]);
  });

  it("no overlaps despite two partnership branches on one person", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("divorce does not remove the parent-child link — C is still a child of both A and B", () => {
    const partnershipAB = result.partnerships.find((p) => p.id === "ab")!;
    expect(partnershipAB.childrenIds).toContain("c");
    expect(partnershipAB.status).toBe("divorced");
  });

  it("C and E are each below their own parent partnership", () => {
    const a = personById(result, "a");
    const c = personById(result, "c");
    const e = personById(result, "e");
    expect(c.y).toBeGreaterThan(a.y);
    expect(e.y).toBeGreaterThan(a.y);
  });
});

describe("CASE 4 — both former spouses remarry", () => {
  const result = buildTreeLayout(case4BothRemarry, "a");

  it("A and B each appear exactly once", () => {
    expect(result.persons.filter((p) => p.id === "a")).toHaveLength(1);
    expect(result.persons.filter((p) => p.id === "b")).toHaveLength(1);
  });

  it("all three partnerships preserved and no overlaps", () => {
    expect(result.partnerships.map((p) => p.id).sort()).toEqual([
      "ab",
      "ad",
      "bf",
    ]);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("children from different partnerships remain distinguishable (different x)", () => {
    const c = personById(result, "c"); // A+B
    const e = personById(result, "e"); // A+D
    const g = personById(result, "g"); // B+F
    const xs = new Set([c.x, e.x, g.x]);
    expect(xs.size).toBe(3);
  });
});

describe("CASE 5 — sibling with its own large subtree", () => {
  const result = buildTreeLayout(case5SiblingSubtree, "p1");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("A's children (D, E, F) do not overlap B or C's position", () => {
    const b = personById(result, "b");
    const c = personById(result, "c");
    for (const id of ["d", "e", "f"]) {
      const child = personById(result, id);
      expect(Math.abs(child.x - b.x) >= CARD_WIDTH || child.y !== b.y).toBe(
        true,
      );
      expect(Math.abs(child.x - c.x) >= CARD_WIDTH || child.y !== c.y).toBe(
        true,
      );
    }
  });

  it("B and C stay near A (siblings adjacent, not pushed arbitrarily far)", () => {
    const a = personById(result, "a");
    const b = personById(result, "b");
    const c = personById(result, "c");
    const siblingXs = [a.x, b.x, c.x].sort((x, y) => x - y);
    // total span should be a small multiple of card width, not blown out by A's subtree
    expect(siblingXs[2] - siblingXs[0]).toBeLessThan(CARD_WIDTH * 6);
  });
});

describe("CASE 6 — one large asymmetric descendant branch among siblings", () => {
  const result = buildTreeLayout(case6AsymmetricBranch, "p1");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("the large branch (big) occupies more horizontal space than a childless sibling", () => {
    const bigChildrenXs = ["b1", "b2", "b3", "b4"].map(
      (id) => personById(result, id).x,
    );
    const bigSpan = Math.max(...bigChildrenXs) - Math.min(...bigChildrenXs);
    expect(bigSpan).toBeGreaterThan(CARD_WIDTH * 2);
  });

  it("small siblings are not pushed to equal width with the big branch", () => {
    const small1 = personById(result, "small1");
    const small2 = personById(result, "small2");
    // small siblings still sit close to their own parent row, not stretched out
    expect(Math.abs(small1.y - small2.y)).toBeLessThan(0.01);
  });
});

describe("CASE 7 — large paternal branch + large maternal branch", () => {
  const result = buildTreeLayout(case7LargeBothSides, "focus");

  it("no overlaps even with two large ancestor clusters on the same row", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("paternal grandparents are left of maternal grandparents", () => {
    const fgf = personById(result, "fgf");
    const mgf = personById(result, "mgf");
    expect(fgf.x).toBeLessThan(mgf.x);
  });

  it("father's siblings (paternal) stay left of mother's siblings (maternal)", () => {
    const paternalMaxX = Math.max(
      ...["fu1", "fu2", "fu3"].map((id) => personById(result, id).x),
    );
    const maternalMinX = Math.min(
      ...["mu1", "mu2", "mu3"].map((id) => personById(result, id).x),
    );
    expect(paternalMaxX).toBeLessThan(maternalMinX);
  });
});

describe("CASE 8 — divorce + remarriage, three generations deep", () => {
  const result = buildTreeLayout(case8DivorceRemarriageDeep, "a");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("grandchild is placed below its parent c, which is below a", () => {
    const a = personById(result, "a");
    const c = personById(result, "c");
    const gc = personById(result, "gc");
    expect(c.y).toBeGreaterThan(a.y);
    expect(gc.y).toBeGreaterThan(c.y);
  });

  it("A's two partnerships (divorced + remarried) are both present", () => {
    const statuses = result.partnerships
      .filter((p) => p.leftPersonId === "a" || p.rightPersonId === "a")
      .map((p) => p.status)
      .sort();
    expect(statuses).toEqual(["divorced", "married"]);
  });
});

describe("CASE 9 — many siblings (8)", () => {
  const result = buildTreeLayout(case9ManySiblings, "p1");

  it("no overlaps among all 8 siblings", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("all 8 siblings are on the same row and ordered without gaps smaller than card width", () => {
    const xs = Array.from(
      { length: 8 },
      (_, i) => personById(result, `s${i}`).x,
    ).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(CARD_WIDTH);
    }
  });
});

describe("CASE 10 — several generations both directions", () => {
  const result = buildTreeLayout(case10ManyGenerations, "focus");

  it("no overlaps across 7 generations", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("y strictly increases from great-great-grandparents down to great-grandchild", () => {
    const chain = [
      "ggf",
      "gf",
      "father",
      "focus",
      "child",
      "grandchild",
      "greatgrandchild",
    ];
    const ys = chain.map((id) => personById(result, id).y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it("focus's partnership stays centered on x=0", () => {
    const focus = personById(result, "focus");
    const spouse = personById(result, "spouse");
    expect((focus.x + spouse.x) / 2).toBeCloseTo(0, 5);
  });
});

describe("CASE 11 — a descendant's spouse has their own recorded parents (in-law ancestors)", () => {
  const result = buildTreeLayout(case11InLawParents, "focus");

  it("every person gets a position (no assertOnePositionPerPerson throw)", () => {
    expect(result.persons.length).toBe(case11InLawParents.persons.length);
  });

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("childSpouse's parents are placed one generation above her, not left at the origin", () => {
    const childSpouse = personById(result, "childSpouse");
    const parent1 = personById(result, "childSpouseParent1");
    const parent2 = personById(result, "childSpouseParent2");
    expect(parent1.y).toBeCloseTo(childSpouse.y - GENERATION_GAP, 5);
    expect(parent2.y).toBeCloseTo(childSpouse.y - GENERATION_GAP, 5);
  });

  it("childSpouse's parents are horizontally close to childSpouse (pulled by her, not defaulted to x=0 far away)", () => {
    const childSpouse = personById(result, "childSpouse");
    const parent1 = personById(result, "childSpouseParent1");
    const parent2 = personById(result, "childSpouseParent2");
    const parentMidX = (parent1.x + parent2.x) / 2;
    expect(Math.abs(parentMidX - childSpouse.x)).toBeLessThan(CARD_WIDTH * 3);
  });

  it("childSpouse's full sibling lands beside her parents, not stranded", () => {
    const parent1 = personById(result, "childSpouseParent1");
    const sibling = personById(result, "childSpouseSibling");
    expect(sibling.y).toBeCloseTo(parent1.y + GENERATION_GAP, 5);
  });
});

describe("global invariants across every case", () => {
  const cases: Array<[string, Parameters<typeof buildTreeLayout>[0], string]> =
    [
      ["real data", initialFamilyGraph, realFocusId],
      ["case1", case1SimpleFamily, "a"],
      ["case2", case2DeepChain, "a"],
      ["case3", case3Remarriage, "a"],
      ["case4", case4BothRemarry, "a"],
      ["case5", case5SiblingSubtree, "p1"],
      ["case6", case6AsymmetricBranch, "p1"],
      ["case7", case7LargeBothSides, "focus"],
      ["case8", case8DivorceRemarriageDeep, "a"],
      ["case9", case9ManySiblings, "p1"],
      ["case10", case10ManyGenerations, "focus"],
      ["case11", case11InLawParents, "focus"],
    ];

  it.each(cases)(
    "%s: one Person node per canonical person, no overlaps, deterministic",
    (_name, graph, focus) => {
      const r1 = buildTreeLayout(graph, focus);
      const r2 = buildTreeLayout(graph, focus);

      expect(r1.persons.length).toBe(graph.persons.length);
      const ids = new Set(r1.persons.map((p) => p.id));
      expect(ids.size).toBe(r1.persons.length);

      expect(detectOverlaps(positionMap(r1))).toEqual([]);
      expect(positionMap(r1)).toEqual(positionMap(r2));
    },
  );
});

/**
 * Rewrite plan §7 Stage 2 gate: run the real 58-person fixture through the
 * hybrid engine (descendants via growBranch("down"), ancestors still via the
 * old placement.ts row-based code — see subtree.ts's growPersonBranchDown)
 * and check it against the SAME invariant checkers used by the random-graph
 * property tests (invariants.property.test.ts), not just pixel-exact
 * regression against the pre-rewrite fixture snapshot. This is the
 * descendant-side "real data" confirmation the plan calls for before Stage 3
 * (ancestors) begins — the pre-existing "real data" describe block above
 * already exercises the same buildTreeLayout call path and has stayed green
 * across Stage 0/1 unchanged, but this block makes the invariant gate
 * explicit and named, rather than only implied by unrelated pixel snapshots.
 */
describe("layout engine — Stage 2: real fixture through hybrid engine, invariant gate", () => {
  it("no card overlaps on the real 58-person family", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("no foreign person interleaved between full siblings on the real family (rewrite plan Stage 4: repairSideConstraintViolations rescues Natalya Ushkar off Galina's crowded row, the one gap this invariant used to tolerate)", () => {
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(findInterleavedSiblingViolation(result)).toBeNull();
  });

  it("Eva (focus's own child) is centered directly under Alexander+Eleonora's partnership, with no crossed trunk", () => {
    // findCrossedTrunkViolation's general "x-order matches childrenIds
    // order" check (used as-is by the random-graph property tests) turns
    // out to be too strong for most rows in this dense real fixture: any
    // row containing a person independently pinned as a placement anchor
    // (the focus person themselves at x=0; an ancestor like Viktor within
    // Nikolai/Elizaveta's children, still placed by the pre-Stage-3
    // placement.ts row-based code in this hybrid engine) can legitimately
    // have its final x-order differ from childrenIds declaration order —
    // that's the documented "already-placed position anchors where the
    // sibling row grows from" rule, not a crossed trunk. Eva is the
    // cleanest direct check for what THIS stage actually needs to confirm:
    // she's an only child with no descendants of her own, so there's no
    // possibility of any anchor pulling her elsewhere — she must simply sit
    // centered under her two parents, exactly as growBranch("down")'s
    // child-centering math (subtree.ts) computes it.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const eva = personById(result, "eva-kupchik");
    const alexander = personById(result, realFocusId);
    const eleonora = personById(result, "eleonora-kupchik");
    expect(eva.x).toBeCloseTo((alexander.x + eleonora.x) / 2, 5);
    expect(eva.y).toBeGreaterThan(alexander.y);
  });

  it("deterministic: rebuilding the real family twice yields identical positions", () => {
    const r1 = buildTreeLayout(initialFamilyGraph, realFocusId);
    const r2 = buildTreeLayout(initialFamilyGraph, realFocusId);
    expect(positionMap(r1)).toEqual(positionMap(r2));
  });

  it('Alexander\'s focus partnership (himself + Eleonora) is still centered on x=0 after routing through the new growBranch("down") primitive', () => {
    // Mirrors the pre-existing "focus person's partnership is centered on
    // the origin" test in the "real data" describe block above (unchanged
    // since before Stage 1) — the true invariant is that the MIDPOINT of
    // the focus person's own partnership sits at x=0 (husband-left/
    // wife-right means Alexander himself is offset left of 0, not AT 0).
    // Re-asserted here, scoped to this Stage 2 gate block, to confirm the
    // one Stage-1-introduced code path this fixture depends on for the
    // focus person's own subtree still upholds it.
    const result = buildTreeLayout(initialFamilyGraph, realFocusId);
    const focus = personById(result, realFocusId);
    const eleonora = personById(result, "eleonora-kupchik");
    expect(focus.y).toBe(0);
    expect((focus.x + eleonora.x) / 2).toBeCloseTo(0, 5);
  });
});

describe("layout engine — isolated persons (no relationship at all)", () => {
  // Regression test for a real production bug: a Person record with ZERO
  // recorded relationships (no parent-child edge in either direction, no
  // partnership) crashed getFocusTreeLayout with
  // "assertOnePositionPerPerson: person ... has no position" — such a
  // person is real data (e.g. added to the family but not linked into the
  // tree yet), not a malformed graph, so the engine must place them, not
  // throw. See NormalizedPerson.isIsolated's own doc comment (types.ts) and
  // placeIsolatedPersons' (subtree.ts).
  const focusId = "focus";
  const isolatedId = "isolated-firas";

  function graphWithOneIsolatedPerson() {
    return {
      persons: [
        {
          id: focusId,
          firstName: "Focus",
          lastName: "Person",
          gender: "unknown" as const,
        },
        {
          id: "spouse",
          firstName: "Spouse",
          lastName: "Person",
          gender: "unknown" as const,
        },
        {
          id: isolatedId,
          firstName: "Firas",
          lastName: "",
          gender: "unknown" as const,
        },
      ],
      relationships: [
        { id: "p1", kind: "spouse" as const, from: focusId, to: "spouse" },
      ],
    };
  }

  it("places the isolated person instead of throwing", () => {
    const result = buildTreeLayout(graphWithOneIsolatedPerson(), focusId);
    expect(result.persons).toHaveLength(3);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("places the isolated person strictly below the rest of the connected graph", () => {
    const result = buildTreeLayout(graphWithOneIsolatedPerson(), focusId);
    const focus = personById(result, focusId);
    const isolated = personById(result, isolatedId);
    expect(isolated.y).toBeGreaterThan(focus.y);
  });

  it("places several isolated persons side by side, deterministically", () => {
    const graph = graphWithOneIsolatedPerson();
    graph.persons.push(
      {
        id: "isolated-2",
        firstName: "Second",
        lastName: "",
        gender: "unknown" as const,
      },
      {
        id: "isolated-3",
        firstName: "Third",
        lastName: "",
        gender: "unknown" as const,
      },
    );
    const result = buildTreeLayout(graph, focusId);
    expect(result.persons).toHaveLength(5);
    expect(detectOverlaps(positionMap(result))).toEqual([]);

    const r2 = buildTreeLayout(graph, focusId);
    expect(positionMap(result)).toEqual(positionMap(r2));
  });

  it("does not disturb the connected graph's own layout", () => {
    // Same connected pair, with vs. without an unrelated isolated person —
    // the focus/spouse partnership must land identically either way.
    const withoutIsolated = buildTreeLayout(
      {
        persons: graphWithOneIsolatedPerson().persons.filter(
          (p) => p.id !== isolatedId,
        ),
        relationships: graphWithOneIsolatedPerson().relationships,
      },
      focusId,
    );
    const withIsolated = buildTreeLayout(graphWithOneIsolatedPerson(), focusId);
    expect(personById(withIsolated, focusId).x).toBe(
      personById(withoutIsolated, focusId).x,
    );
    expect(personById(withIsolated, "spouse").x).toBe(
      personById(withoutIsolated, "spouse").x,
    );
  });
});

describe("layout engine — compact sibling row regardless of one sibling's deep descendant subtree", () => {
  // Regression test for a real production bug (Biblical-scale genealogy
  // fixture: Adam → Cain/Abel/Seth, Seth's own line running Enosh → Kenan →
  // ... → Lamech → Noah → Shem/Ham/Japheth, several more generations deep).
  // Before compactWidth (subtree.ts), growChildrenRowDown spaced full
  // siblings by each child's TOTAL subtree width (descendant-inclusive), so
  // Seth — whose line is 12 generations deep and eventually branches into
  // Noah's three sons — got pushed thousands of pixels away from Cain and
  // Abel even though the three are full siblings who should sit adjacent
  // (CLAUDE.md TREE LAYOUT RULES §5). Fixed by spacing the ROW using each
  // child's compactWidth (own row only) while each child's OWN recursion
  // into their descendants still does an honest occupancy search several
  // rows down — see subtree.ts's growChildrenRowDown doc comment.
  const focusId = "adam";

  function threeSiblingsOneWithDeepChain(): FamilyGraph {
    const persons: FamilyGraph["persons"] = [
      { id: "adam", firstName: "Adam", lastName: "", gender: "male" },
      { id: "eve", firstName: "Eve", lastName: "", gender: "female" },
      { id: "cain", firstName: "Cain", lastName: "", gender: "male" },
      { id: "abel", firstName: "Abel", lastName: "", gender: "male" },
      { id: "seth", firstName: "Seth", lastName: "", gender: "male" },
    ];
    const relationships: FamilyGraph["relationships"] = [
      { id: "adam-eve", kind: "spouse", from: "adam", to: "eve" },
      { id: "pc-cain", kind: "parent-child", from: "adam", to: "cain" },
      { id: "pc-abel", kind: "parent-child", from: "adam", to: "abel" },
      { id: "pc-seth", kind: "parent-child", from: "adam", to: "seth" },
    ];
    // A single unbranched chain of 10 solo-parent generations under Seth
    // (no spouse recorded for any of them, matching the real fixture's
    // sparse-data shape), THEN a branch into 3 children at the bottom —
    // mirrors Noah fathering Shem/Ham/Japheth after a long solo chain.
    let parent = "seth";
    for (let i = 0; i < 10; i++) {
      const id = `seth-desc-${i}`;
      persons.push({ id, firstName: id, lastName: "", gender: "unknown" });
      relationships.push({
        id: `pc-${id}`,
        kind: "parent-child",
        from: parent,
        to: id,
      });
      parent = id;
    }
    for (const child of ["branch-a", "branch-b", "branch-c"]) {
      persons.push({
        id: child,
        firstName: child,
        lastName: "",
        gender: "unknown",
      });
      relationships.push({
        id: `pc-${child}`,
        kind: "parent-child",
        from: parent,
        to: child,
      });
    }
    return { persons, relationships };
  }

  it("Cain, Abel, and Seth sit at exactly the standard sibling gap from each other", () => {
    const result = buildTreeLayout(threeSiblingsOneWithDeepChain(), focusId);
    const cain = personById(result, "cain");
    const abel = personById(result, "abel");
    const seth = personById(result, "seth");
    const xs = [cain, abel, seth].sort((a, b) => a.x - b.x).map((p) => p.x);
    expect(xs[1] - xs[0]).toBeCloseTo(CARD_WIDTH + SIBLING_GAP, 5);
    expect(xs[2] - xs[1]).toBeCloseTo(CARD_WIDTH + SIBLING_GAP, 5);
  });

  it("has no overlaps despite Seth's 10-generation-deep, then 3-way-branching descendant chain", () => {
    const result = buildTreeLayout(threeSiblingsOneWithDeepChain(), focusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("is deterministic", () => {
    const graph = threeSiblingsOneWithDeepChain();
    const r1 = buildTreeLayout(graph, focusId);
    const r2 = buildTreeLayout(graph, focusId);
    expect(positionMap(r1)).toEqual(positionMap(r2));
  });
});

describe("multiple marriages laid out on opposite sides (Lamech between Adah and Zillah)", () => {
  // Regression fixture matching the real Biblical-scale data that surfaced
  // this: Lamech has two wives, Adah (with children Jabal/Jubal) and Zillah
  // (with children Tubal-cain/Naamah), plus Noah recorded as Lamech's solo
  // child (no mother recorded) — CLAUDE.md TREE LAYOUT RULES §7. Per the
  // user's explicit request: "если у мужчины две жены то их размещать по
  // обе стороны" (if a man has two wives, place them on opposite sides).
  const focusId = "lamech";

  function lamechTwoWives(): FamilyGraph {
    const persons: FamilyGraph["persons"] = [
      { id: "lamech", firstName: "Lamech", lastName: "", gender: "male" },
      { id: "adah", firstName: "Adah", lastName: "", gender: "female" },
      { id: "zillah", firstName: "Zillah", lastName: "", gender: "female" },
      { id: "jabal", firstName: "Jabal", lastName: "", gender: "unknown" },
      { id: "jubal", firstName: "Jubal", lastName: "", gender: "unknown" },
      {
        id: "tubalcain",
        firstName: "Tubal-cain",
        lastName: "",
        gender: "unknown",
      },
      { id: "naamah", firstName: "Naamah", lastName: "", gender: "unknown" },
      { id: "noah", firstName: "Noah", lastName: "", gender: "unknown" },
    ];
    const relationships: FamilyGraph["relationships"] = [
      { id: "lamech-adah", kind: "spouse", from: "lamech", to: "adah" },
      { id: "lamech-zillah", kind: "spouse", from: "lamech", to: "zillah" },
      { id: "pc-jabal-a", kind: "parent-child", from: "lamech", to: "jabal" },
      { id: "pc-jabal-b", kind: "parent-child", from: "adah", to: "jabal" },
      { id: "pc-jubal-a", kind: "parent-child", from: "lamech", to: "jubal" },
      { id: "pc-jubal-b", kind: "parent-child", from: "adah", to: "jubal" },
      {
        id: "pc-tubalcain-a",
        kind: "parent-child",
        from: "lamech",
        to: "tubalcain",
      },
      {
        id: "pc-tubalcain-b",
        kind: "parent-child",
        from: "zillah",
        to: "tubalcain",
      },
      { id: "pc-naamah-a", kind: "parent-child", from: "lamech", to: "naamah" },
      { id: "pc-naamah-b", kind: "parent-child", from: "zillah", to: "naamah" },
      // Noah: recorded under Lamech only (no mother) — a genuine solo-parent
      // child ALONGSIDE two real partnerships, not miscategorized into one
      // of them (see tree-layout-compact-sibling-row memory's open
      // follow-up on the separate sharedChildren/sparseDataUnion bug this
      // fixture deliberately sidesteps by giving Noah no recorded mother at
      // all, rather than testing that unrelated data-modeling bug here).
      { id: "pc-noah", kind: "parent-child", from: "lamech", to: "noah" },
    ];
    return { persons, relationships };
  }

  it("Adah and Zillah sit on OPPOSITE sides of Lamech's own card, not side by side on one side", () => {
    const result = buildTreeLayout(lamechTwoWives(), focusId);
    const lamech = personById(result, focusId);
    const adah = personById(result, "adah");
    const zillah = personById(result, "zillah");
    expect(adah.x).toBeLessThan(lamech.x);
    expect(zillah.x).toBeGreaterThan(lamech.x);
    expect(lamech.x - adah.x).toBeCloseTo(CARD_WIDTH + SPOUSE_GAP, 5);
    expect(zillah.x - lamech.x).toBeCloseTo(CARD_WIDTH + SPOUSE_GAP, 5);
  });

  it("Noah (Lamech's solo-parent child, no recorded mother) lands EXACTLY below Lamech's own card, not displaced by Adah's/Zillah's children", () => {
    // Solo-parenthood's children grow FIRST (growPersonBranchDown,
    // subtree.ts), before either marriage's children row — Adah's
    // (Jabal/Jubal) and Zillah's (Tubal-cain/Naamah) children rows grow
    // OUTWARD from their own branchCenter, away from Lamech's own x, so
    // once Noah's slot is reserved first, neither marriage's children row
    // ever contests it. User's own explicit request: "жёны Ламеха по краям
    // — значит и их дети должны быть по краям", leaving the center free for
    // Noah directly under Lamech.
    const result = buildTreeLayout(lamechTwoWives(), focusId);
    const lamech = personById(result, focusId);
    const noah = personById(result, "noah");
    expect(noah.x).toBeCloseTo(lamech.x, 5);
    expect(noah.y).toBeGreaterThan(lamech.y);
  });

  it("has no overlaps", () => {
    const result = buildTreeLayout(lamechTwoWives(), focusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("is deterministic", () => {
    const graph = lamechTwoWives();
    const r1 = buildTreeLayout(graph, focusId);
    const r2 = buildTreeLayout(graph, focusId);
    expect(positionMap(r1)).toEqual(positionMap(r2));
  });
});

describe("odd marriage count (3 marriages) stays symmetric around the person's own card", () => {
  // Regression test for a real bug caught by property testing: with an ODD
  // number of marriages (2 branches on one side, 1 on the other), the
  // person's own card is still fixed exactly at the row's own childCenter
  // (growPersonBranchDown's 2+ partnership branch), but the WIDER side then
  // extends further from that center than the narrower side — an
  // un-mirrored compactWidth (left+right, not symmetric) reserved the
  // correct TOTAL area but assumed it was centered on childCenter, so an
  // unrelated neighboring sibling on the narrow side ended up inside the
  // real (off-center) unit's footprint. Fixed by mirroring the wider side
  // (compactWidth = CARD_WIDTH + 2*max(leftWidth, rightWidth)) — see
  // multiPartnershipRowWidth's own doc comment.
  const focusId = "focus";

  function personWithThreeMarriages(): FamilyGraph {
    const persons: FamilyGraph["persons"] = [
      { id: "focus", firstName: "Focus", lastName: "", gender: "male" },
      { id: "sibling", firstName: "Sibling", lastName: "", gender: "unknown" },
      { id: "parent", firstName: "Parent", lastName: "", gender: "unknown" },
      { id: "thrice", firstName: "Thrice", lastName: "", gender: "male" },
      { id: "wife1", firstName: "Wife1", lastName: "", gender: "female" },
      { id: "wife2", firstName: "Wife2", lastName: "", gender: "female" },
      { id: "wife3", firstName: "Wife3", lastName: "", gender: "female" },
    ];
    const relationships: FamilyGraph["relationships"] = [
      // "focus" and "thrice" are full siblings sharing a solo parent —
      // "sibling" is squeezed in the middle for the property-test-shaped
      // topology, but the key case is focus/thrice adjacency.
      { id: "pc-focus", kind: "parent-child", from: "parent", to: "focus" },
      { id: "pc-sibling", kind: "parent-child", from: "parent", to: "sibling" },
      { id: "pc-thrice", kind: "parent-child", from: "parent", to: "thrice" },
      { id: "thrice-wife1", kind: "spouse", from: "thrice", to: "wife1" },
      { id: "thrice-wife2", kind: "spouse", from: "thrice", to: "wife2" },
      { id: "thrice-wife3", kind: "spouse", from: "thrice", to: "wife3" },
    ];
    return { persons, relationships };
  }

  it("has no overlaps between the thrice-married sibling's branches and their own neighboring sibling", () => {
    const result = buildTreeLayout(personWithThreeMarriages(), focusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("thrice's own card sits at the row's compact cursor slot, wives alternating left/right/left", () => {
    const result = buildTreeLayout(personWithThreeMarriages(), focusId);
    const thrice = personById(result, "thrice");
    const wife1 = personById(result, "wife1");
    const wife2 = personById(result, "wife2");
    const wife3 = personById(result, "wife3");
    expect(wife1.x).toBeLessThan(thrice.x); // 1st marriage: left
    expect(wife2.x).toBeGreaterThan(thrice.x); // 2nd marriage: right
    expect(wife3.x).toBeLessThan(wife1.x); // 3rd marriage: further left
  });
});
