import { describe, expect, it } from "vitest";
import { buildTreeV4Layout } from "./layout";
import { detectOverlaps } from "./collision";
import { CARD_WIDTH, SIBLING_GAP, SPOUSE_GAP } from "./subtree";
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
} from "./test-fixtures";
import type { TreeLayoutResult } from "./types";

function positionMap(result: TreeLayoutResult) {
  return new Map(result.persons.map((p) => [p.id, { x: p.x, y: p.y }]));
}

function personById(result: TreeLayoutResult, id: string) {
  const p = result.persons.find((person) => person.id === id);
  if (!p)
    throw new Error(`test fixture missing person "${id}" in layout result`);
  return p;
}

describe("tree-v4 — real data (Alexander/Eleonora/Eva + Viktor/Galina/Daria + Nikolai/Elizaveta/Nikolai Jr./Svetlana/Natalya + Vladimir Evtukh/Egor/Anastasiya + Viktor Efimovich/Olga/Yuriy + Vladimir/Marfa + Yustin (solo) + Grigory/Elizaveta Krivusha + Nikolai/Nadezhda Kozlovsky + Nikolai's brothers Yuzik/Daniil/Alexey + Vasily/Elizaveta Kozlovskaya + Petr (solo)/Yakov (solo) + Grigory Kolesnikovich/Agrafena + Filipp (solo) + Nadezhda's brothers Nikolai/Alexey/Pavel/Grigory Jr. Kolesnikovich + Galina's 8 sisters (own married surnames) + Galina's sisters' own husbands (Viktor Ravbetsky/Alexey Naumovich/Vladimir Artyukh/Vladimir Baidovsky/Alexander Stashevsky/Sergey Shlyazhko/Oleg Redko) + Marina's children Lyudmila+Vadim minimal core)", () => {
  it("places every person exactly once with no overlaps", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    expect(result.persons).toHaveLength(55);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("focus person's partnership is centered on the origin (focus is the spatial anchor)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const focus = personById(result, realFocusId);
    const eleonora = personById(result, "eleonora-kupchik");
    expect(focus.y).toBe(0);
    expect((focus.x + eleonora.x) / 2).toBeCloseTo(0, 5);
  });

  it("husband (Alexander) is left of wife (Eleonora)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    const eva = personById(result, "eva-kupchik");
    const parentsCenterX = (alexander.x + eleonora.x) / 2;
    expect(eva.x).toBeCloseTo(parentsCenterX, 5);
  });

  it("Eva (child) is below her parents", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eva = personById(result, "eva-kupchik");
    expect(eva.y).toBeGreaterThan(alexander.y);
  });

  it("is deterministic — same graph, same focus, identical positions", () => {
    const r1 = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const r2 = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    expect(positionMap(r1)).toEqual(positionMap(r2));
  });

  it("Alexander's parents (Viktor and Galina) are above him", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(viktor.y).toBeLessThan(alexander.y);
    expect(galina.y).toBeLessThan(alexander.y);
  });

  it("Viktor (husband) is left of Galina (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    const grandparentsCenterX = (viktor.x + galina.x) / 2;
    const siblingRowCenterX = (alexander.x + daria.x) / 2;
    expect(grandparentsCenterX).toBeCloseTo(siblingRowCenterX, 5);
  });

  it("Daria (Alexander's sister) is at the same generation, next to Alexander, under their shared parents", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    expect(Math.abs(alexander.x - daria.x)).toBeGreaterThanOrEqual(CARD_WIDTH);
  });

  it("Viktor's own parents (Nikolai and Elizaveta) are above him, one generation further up than Viktor/Galina", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const nikolai = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    expect(nikolai.y).toBeLessThan(viktor.y);
    expect(elizaveta.y).toBeLessThan(viktor.y);
  });

  it("Nikolai (husband) is left of Elizaveta (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");
    expect(vladimir.y).toBeLessThan(nikolai.y);
    expect(marfa.y).toBeLessThan(nikolai.y);
  });

  it("Vladimir (husband) is left of Marfa (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");
    expect(vladimir.x).toBeLessThan(marfa.x);
  });

  it("Vladimir/Marfa and Grigory/Elizaveta Krivusha (both Nikolai Kupchik Sr.'s side, one generation further up) are pulled off-center from their own children by equal, opposite amounts (symmetric kink, not one-straight-one-kinked)", () => {
    // Vladimir/Marfa (pulled toward Nikolai) and Grigory/Elizaveta Krivusha
    // (pulled toward Elizaveta, Nikolai's wife) are BOTH labeled "paternal"
    // branch here — they're two independent couples that happen to land on
    // the same generation row, one generation above Nikolai/Elizaveta. Same
    // situation as Nikolai/Elizaveta Kupchik vs Nikolai/Nadezhda Kozlovsky:
    // Nikolai and Elizaveta stay at the standard SPOUSE_GAP, so their two
    // respective parent couples can't both center exactly above their own
    // child without overlapping. The shortfall is split evenly rather than
    // one couple keeping a perfect center while the other absorbs it all.
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const nikolai = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    const vladimir = personById(result, "vladimir-kupchik");
    const marfa = personById(result, "marfa-kupchik");
    const grigory = personById(result, "grigory-krivusha");
    const elizavetaKrivusha = personById(result, "elizaveta-krivusha");

    const vladimirMarfaCenterX = (vladimir.x + marfa.x) / 2;
    const krivushaCenterX = (grigory.x + elizavetaKrivusha.x) / 2;
    const vladimirMarfaOffset = vladimirMarfaCenterX - nikolai.x;
    const krivushaOffset = krivushaCenterX - elizaveta.x;

    expect(Math.abs(vladimirMarfaOffset)).toBeGreaterThan(1);
    expect(Math.abs(krivushaOffset)).toBeGreaterThan(1);
    expect(vladimirMarfaOffset).toBeCloseTo(-krivushaOffset, 5);
  });

  it("Grigory (husband) is left of Elizaveta Krivusha (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const grigory = personById(result, "grigory-krivusha");
    const elizavetaKrivusha = personById(result, "elizaveta-krivusha");
    expect(grigory.x).toBeLessThan(elizavetaKrivusha.x);
  });

  it("Grigory/Elizaveta Krivusha are above Elizaveta Kupchik, at the same generation as Vladimir/Marfa", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const vladimir = personById(result, "vladimir-kupchik");
    const yustin = personById(result, "yustin-kupchik");
    expect(yustin.y).toBeLessThan(vladimir.y);
    expect(yustin.x).toBeCloseTo(vladimir.x, 5);
  });

  it("Vasily and Elizaveta Kozlovskaya (Nikolai Kozlovsky's own parents) are above him, one generation further up than Nikolai/Nadezhda", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const vasily = personById(result, "vasily-kozlovsky");
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    expect(vasily.y).toBeLessThan(nikolaiKozlovsky.y);
    expect(elizavetaKozlovskaya.y).toBeLessThan(nikolaiKozlovsky.y);
  });

  it("Vasily (husband) is left of Elizaveta Kozlovskaya (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const grigoryKolesnikovich = personById(result, "grigory-kolesnikovich");
    const agrafena = personById(result, "agrafena-kolesnikovich");
    const vasily = personById(result, "vasily-kozlovsky");
    expect(grigoryKolesnikovich.y).toBeLessThan(nadezhda.y);
    expect(agrafena.y).toBeLessThan(nadezhda.y);
    expect(grigoryKolesnikovich.y).toBe(vasily.y);
  });

  it("Grigory Kolesnikovich (husband) is left of Agrafena (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const grigoryKolesnikovich = personById(result, "grigory-kolesnikovich");
    const agrafena = personById(result, "agrafena-kolesnikovich");
    expect(grigoryKolesnikovich.x).toBeLessThan(agrafena.x);
  });

  it("Grigory Kolesnikovich and Agrafena's partnership is centered over the whole sibling row (Nadezhda + her brothers Nikolai/Alexey/Pavel/Grigory Jr.), not just over Nadezhda alone", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const vasily = personById(result, "vasily-kozlovsky");
    const petr = personById(result, "petr-kozlovsky");
    expect(petr.y).toBeLessThan(vasily.y);
    expect(Math.abs(petr.x - vasily.x)).toBeLessThan(CARD_WIDTH);
  });

  it("Petr and Yakov (both solo parents sharing a row) are pulled off-center from Vasily/Elizaveta Kozlovskaya by equal, opposite amounts", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const vasily = personById(result, "vasily-kozlovsky");
    const elizavetaKozlovskaya = personById(result, "elizaveta-kozlovskaya");
    const petr = personById(result, "petr-kozlovsky");
    const yakov = personById(result, "yakov-kozlovsky");
    const petrOffset = petr.x - vasily.x;
    const yakovOffset = yakov.x - elizavetaKozlovskaya.x;
    expect(petrOffset).toBeCloseTo(-yakovOffset, 5);
  });

  it("Yakov (Elizaveta Kozlovskaya's father, a SOLO parent) is above her, right of Petr", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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

  it("Vladimir Evtukh (Natalya's husband) is left of Natalya, and their children Egor/Anastasiya are below them", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const vladimirEvtukh = personById(result, "vladimir-evtukh");
    const natalya = personById(result, "natalya-kupchik");
    const egor = personById(result, "egor-evtukh");
    const anastasiya = personById(result, "anastasiya-evtukh");
    expect(vladimirEvtukh.x).toBeLessThan(natalya.x);
    expect(vladimirEvtukh.y).toBe(natalya.y);
    expect(egor.y).toBeGreaterThan(natalya.y);
    expect(anastasiya.y).toBeGreaterThan(natalya.y);
  });

  it("Viktor Efimovich (Svetlana's husband) is left of Svetlana, and their children Olga/Yuriy are below them", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, realFocusId);
    const daria = personById(result, "daria-kupchik");
    expect(Math.abs(daria.x - alexander.x)).toBeCloseTo(
      CARD_WIDTH + SIBLING_GAP,
      5,
    );
  });

  it("no overlaps across all three generations (Nikolai/Elizaveta, Viktor/Galina + Daria, Alexander + Eleonora/Eva)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("Galina's own parents (Nikolai and Nadezhda Kozlovsky) are above her, at the same generation as Nikolai/Elizaveta Kupchik", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const galina = personById(result, "galina-kupchik");
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const nikolaiKupchik = personById(result, "nikolai-kupchik");
    expect(nikolaiKozlovsky.y).toBeLessThan(galina.y);
    expect(nadezhda.y).toBeLessThan(galina.y);
    expect(nikolaiKozlovsky.y).toBe(nikolaiKupchik.y);
  });

  it("Nikolai Kozlovsky (husband) is left of Nadezhda (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const galina = personById(result, "galina-kupchik");
    const nina = personById(result, "nina-tikhonovich");
    const marina = personById(result, "marina-ravbetskaya");
    const viktorRavbetsky = personById(result, "viktor-ravbetsky");
    // Galina's sibling row runs Galina, Nina, [Viktor Ravbetsky, Marina], ...
    // — all increasing in x, all on Galina's own row, none of them jumping
    // over to Viktor Kupchik's side (which is at negative x, left of Galina).
    expect(nina.x).toBeGreaterThan(galina.x);
    expect(viktorRavbetsky.x).toBeGreaterThan(nina.x);
    expect(marina.x).toBeGreaterThan(viktorRavbetsky.x);
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
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const marina = personById(result, "marina-ravbetskaya");
    const viktorRavbetsky = personById(result, "viktor-ravbetsky");
    expect(viktorRavbetsky.y).toBe(marina.y);
    expect(viktorRavbetsky.x).toBeLessThan(marina.x);
    expect(Math.abs(marina.x - viktorRavbetsky.x)).toBeLessThan(CARD_WIDTH * 3);
  });

  it("Marina's children Lyudmila and Vadim Ravbetsky are placed below Marina/Viktor Ravbetsky, with no overlaps", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const marina = personById(result, "marina-ravbetskaya");
    const lyudmilaRavbetskaya = personById(result, "lyudmila-ravbetskaya");
    const vadim = personById(result, "vadim-ravbetsky");
    expect(lyudmilaRavbetskaya.y).toBeGreaterThan(marina.y);
    expect(vadim.y).toBeGreaterThan(marina.y);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("the other five sisters' husbands (Alexey Naumovich, Vladimir Artyukh, Vladimir Baidovsky, Alexander Stashevsky, Sergey Shlyazhko, Oleg Redko) each stay adjacent to their own wife, on her left (male < female)", () => {
    // Same fix as Marina/Viktor Ravbetsky, now exercised with FIVE more
    // sister-with-spouse pairs sharing the same contiguous row — confirms
    // the placeUnplacedSiblings unit-width fix generalizes past the first
    // case it was found and fixed on.
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
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
      expect(husband.x).toBeLessThan(wife.x);
      expect(Math.abs(wife.x - husband.x)).toBeLessThan(CARD_WIDTH * 3);
    }
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("Viktor and Galina stay at the standard spouse gap, never stretched apart for their own grandparents' sake", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(galina.x - viktor.x).toBeCloseTo(CARD_WIDTH + SPOUSE_GAP, 5);
  });

  it("paternal great-grandparents (Nikolai/Elizaveta Kupchik) stay left of maternal great-grandparents (Nikolai/Nadezhda Kozlovsky) — the two ancestor lines never mix", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const nikolaiKupchik = personById(result, "nikolai-kupchik");
    const elizaveta = personById(result, "elizaveta-kupchik");
    const nikolaiKozlovsky = personById(result, "nikolai-kozlovsky");
    const nadezhda = personById(result, "nadezhda-kozlovskaya");
    const paternalMaxX = Math.max(nikolaiKupchik.x, elizaveta.x);
    const maternalMinX = Math.min(nikolaiKozlovsky.x, nadezhda.x);
    expect(paternalMaxX).toBeLessThan(maternalMinX);
  });

  it("no overlaps with both great-grandparent couples on the same row", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });
});

describe("CASE 1 — simple nuclear family (A+B -> C, D, E)", () => {
  const result = buildTreeV4Layout(case1SimpleFamily, "a");

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
  const result = buildTreeV4Layout(case2DeepChain, "a");

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
  const result = buildTreeV4Layout(case3Remarriage, "a");

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
  const result = buildTreeV4Layout(case4BothRemarry, "a");

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
  const result = buildTreeV4Layout(case5SiblingSubtree, "p1");

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
  const result = buildTreeV4Layout(case6AsymmetricBranch, "p1");

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
  const result = buildTreeV4Layout(case7LargeBothSides, "focus");

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
  const result = buildTreeV4Layout(case8DivorceRemarriageDeep, "a");

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
  const result = buildTreeV4Layout(case9ManySiblings, "p1");

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
  const result = buildTreeV4Layout(case10ManyGenerations, "focus");

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

describe("global invariants across every case", () => {
  const cases: Array<
    [string, Parameters<typeof buildTreeV4Layout>[0], string]
  > = [
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
  ];

  it.each(cases)(
    "%s: one Person node per canonical person, no overlaps, deterministic",
    (_name, graph, focus) => {
      const r1 = buildTreeV4Layout(graph, focus);
      const r2 = buildTreeV4Layout(graph, focus);

      expect(r1.persons.length).toBe(graph.persons.length);
      const ids = new Set(r1.persons.map((p) => p.id));
      expect(ids.size).toBe(r1.persons.length);

      expect(detectOverlaps(positionMap(r1))).toEqual([]);
      expect(positionMap(r1)).toEqual(positionMap(r2));
    },
  );
});
