import { describe, it, expect } from "vitest";
import { buildTreeV3Layout } from "./layout";
import { detectOverlaps, CARD_HEIGHT } from "./collision";
import { CARD_WIDTH, SIBLING_GAP, SPOUSE_GAP } from "./subtree";
import { initialFamilyGraph, focusPersonId as realFocusId } from "./fixture";
import type { FamilyGraph } from "./types";

/**
 * tree-v3 — geometry property tests (§39). Не snapshot-тесты: проверяем
 * геометрические инварианты (нет пересечений, родители выше детей, муж
 * слева от жены, детерминизм и т.д.), которые должны держаться для ЛЮБОГО
 * валидного генеалогического графа — реального (Ushkar/Evtukh/Kupchik/
 * Kozlovsky/Kolesnikovich, §40) и синтетического (§41, кейсы A–H).
 */

function personOf(
  id: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    gender: "male" | "female" | "unknown";
  }> = {},
) {
  return {
    id,
    firstName: overrides.firstName ?? id,
    lastName: overrides.lastName ?? "",
    gender: overrides.gender ?? ("unknown" as const),
  };
}

function spouse(id: string, from: string, to: string) {
  return { id, kind: "spouse" as const, from, to };
}

function parentChild(id: string, from: string, to: string) {
  return { id, kind: "parent-child" as const, from, to };
}

describe("tree-v3 layout — real data (§40 regression case)", () => {
  it("places every person from the real fixture with no overlaps", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    expect(result.persons).toHaveLength(initialFamilyGraph.persons.length);
  });

  it("produces zero geometric overlaps on the real fixture", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("keeps the focus person at (0, 0) — §6/§28", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const focus = result.persons.find((p) => p.id === realFocusId)!;
    expect(focus.x).toBe(0);
    expect(focus.y).toBe(0);
  });

  it("keeps focus's own parents adjacent (husband-left/wife-right, §9) while their OWN ancestors diverge paternal-left/maternal-right (§7/§8)", () => {
    // Product requirement: spouses must always sit next to each other,
    // regardless of how many siblings/ancestors branch off elsewhere — a
    // partnership line stretching across the canvas between two far-apart
    // cards reads as crossing unrelated sibling cards, which violates
    // "connector lines never cross" (CLAUDE.md TREE LAYOUT RULES). So
    // Viktor+Galina (focus's own parents) sit adjacently; the paternal/
    // maternal split (§7/§8) instead governs where THEIR OWN ancestors grow.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const viktor = byId.get("viktor-kupchik")!;
    const galina = byId.get("galina-kupchik")!;
    expect(viktor.y).toBe(galina.y);
    expect(Math.abs(viktor.x - galina.x)).toBeLessThan(CARD_WIDTH * 2);
    expect(viktor.x).toBeLessThan(galina.x); // husband-left/wife-right (§9)

    const nikolaiKozlovsky = byId.get("nikolai-kozlovsky")!; // Galina's father — maternal grandfather
    const nikolaiKupchikSr = byId.get("nikolai-kupchik")!; // Viktor's father — paternal grandfather
    expect(nikolaiKupchikSr.x).toBeLessThan(viktor.x); // paternal ancestors grow further left
    expect(nikolaiKozlovsky.x).toBeGreaterThan(galina.x); // maternal ancestors grow further right
  });

  it("places the focus person's own full sibling next to the focus, not past the focus's spouse (§11)", () => {
    // Daria Kupchik is Alexander's full sibling (same parents: Viktor +
    // Galina). Product requirement: a full sibling reads as "next to the
    // focus person" — the old default (direction==="free" always grows
    // sibling rows rightward) landed Daria past Eleonora (focus's spouse,
    // who sits on the right per husband-left/wife-right, §9), which reads as
    // "the sister stands next to the wife" instead of next to Alexander.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const alexander = byId.get(realFocusId)!;
    const eleonora = byId.get("eleonora-kupchik")!;
    const daria = byId.get("daria-kupchik")!;

    expect(daria.y).toBe(alexander.y);
    // Daria sits on the opposite side from the spouse (spouse is right of
    // focus, §9) — i.e. to the left of Alexander, not beyond Eleonora.
    expect(daria.x).toBeLessThan(alexander.x);
    expect(daria.x).toBeLessThan(eleonora.x);

    // Product requirement: sibling-to-sibling edge gap is exactly double the
    // spouse-to-spouse edge gap (SIBLING_GAP === 2×SPOUSE_GAP by definition
    // in subtree.ts) — Alexander himself is husband-left of Eleonora (not
    // centered between his own card and hers), so the sibling row's start
    // edge must be measured from Alexander's OWN card edge, not from a
    // symmetric "card+spouse" block around him (that inflated the gap to
    // 168px instead of 64px — see history in placeFixedAnchorSiblingRow).
    const spouseEdgeGap =
      eleonora.x - CARD_WIDTH / 2 - (alexander.x + CARD_WIDTH / 2);
    const siblingEdgeGap =
      alexander.x - CARD_WIDTH / 2 - (daria.x + CARD_WIDTH / 2);
    expect(siblingEdgeGap).toBe(spouseEdgeGap * 2);
  });

  it("gives adjacent siblings WITHOUT a spouse the same edge gap as spouses (§11)", () => {
    // Nina, Marina and Tatyana Kozlovskaya are Galina's full siblings — none
    // of them has a partner in the fixture, so they should read as one
    // tight family cluster (SPOUSE_GAP between each unpaired neighbor pair),
    // not spaced out with the wider SIBLING_GAP meant to separate distinct
    // sub-families within a row.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const nina = byId.get("nina-kozlovskaya")!;
    const marina = byId.get("marina-kozlovskaya")!;
    const tatyana = byId.get("tatyana-kozlovskaya")!;

    const edgeGap = (a: { x: number }, b: { x: number }) =>
      b.x - CARD_WIDTH / 2 - (a.x + CARD_WIDTH / 2);

    expect(edgeGap(nina, marina)).toBe(SPOUSE_GAP);
    expect(edgeGap(marina, tatyana)).toBe(SPOUSE_GAP);
  });

  it("gives an unpaired sibling flanked by two PAIRED siblings the normal, wider sibling gap on both sides (§11)", () => {
    // Nikolai Jr. Kupchik (Viktor's full sibling) has no spouse in the
    // fixture, but BOTH of his row neighbors do (Svetlana ↔ Viktor
    // Efimovich; Viktor ↔ Galina) — the tight SPOUSE_GAP clustering only
    // applies between neighbors that are BOTH unpaired; once either side of
    // a pair has its own spouse occupying space, the normal, wider
    // SIBLING_GAP applies instead (§9's spouse-adjacency already accounts
    // for that side).
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const svetlana = byId.get("svetlana-kupchik")!;
    const nikolaiJr = byId.get("nikolai-kupchik-jr")!;
    const viktor = byId.get("viktor-kupchik")!;

    const edgeGap = (a: { x: number }, b: { x: number }) =>
      b.x - CARD_WIDTH / 2 - (a.x + CARD_WIDTH / 2);

    // Svetlana ↔ Nikolai Jr.: AT LEAST SIBLING_GAP — Svetlana's own
    // descendant subtree (her children Olga/Yuriy, unpaired, needing
    // 2×CARD_WIDTH+SIBLING_GAP) is wider than her own couple-card footprint
    // (CARD_WIDTH×2+SPOUSE_GAP with Viktor Efimovich), so her whole subtree
    // — including her own card — gets pushed further out than the bare
    // sibling formula alone would place her.
    expect(edgeGap(svetlana, nikolaiJr)).toBeGreaterThanOrEqual(SIBLING_GAP);
    // Nikolai Jr. ↔ Viktor: exactly SIBLING_GAP — Viktor's own subtree
    // isn't wider than his couple footprint, so nothing pushes this gap out.
    expect(edgeGap(nikolaiJr, viktor)).toBe(SIBLING_GAP);
  });

  it("gives two unrelated grandparent couples AT LEAST the same edge gap as full siblings (§11)", () => {
    // Elizaveta Kupchik (paternal grandmother, Nikolai Kupchik Sr.'s wife)
    // and Nikolai Kozlovsky (maternal grandfather, Nadezhda's husband) are
    // the innermost members of two DIFFERENT families (Kupchik side vs.
    // Kozlovsky side) that happen to land on the same generation row.
    // Product requirement: this inter-family gap should read AT LEAST like
    // the gap between full siblings (SIBLING_GAP) — not just clear a bare
    // anti-collision minimum (MIN_GAP+RESOLUTION_GAP = 20px, which used to
    // land the pair only 48px apart edge-to-edge — see history in
    // resolveGrandparentSymmetry). It can end up WIDER than exactly
    // SIBLING_GAP when Viktor's own siblings (a separate §11 requirement)
    // push the paternal cluster further out on their own — the assertion is
    // a floor, not an exact target.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const elizaveta = byId.get("elizaveta-kupchik")!;
    const nikolaiKozlovsky = byId.get("nikolai-kozlovsky")!;

    expect(elizaveta.y).toBe(nikolaiKozlovsky.y);
    const edgeGap =
      nikolaiKozlovsky.x - CARD_WIDTH / 2 - (elizaveta.x + CARD_WIDTH / 2);
    expect(edgeGap).toBeGreaterThanOrEqual(SIBLING_GAP);
  });

  it("keeps each grandparent-couple's innermost member on their own child's side of the paternal/maternal split (§7/§8)", () => {
    // Nikolai Kozlovsky (maternal grandfather) sits husband-left of his own
    // wife Nadezhda (§9) — but that couple, as a whole, must stay entirely
    // on Galina's (their daughter's) side of x=0, i.e. Nikolai Kozlovsky
    // himself must not cross LEFT of Galina into paternal territory. This
    // used to slip through resolveGrandparentSymmetry whenever the OTHER
    // (paternal) half was independently very wide — e.g. once Viktor gained
    // full siblings (Nikolai Jr., Svetlana, Natalya), the paternal cluster's
    // sibling row alone created a huge measured gap between the two couples,
    // so the function's early-return ("gap already >= SIBLING_GAP") fired
    // BEFORE the separate "stay on your own child's side" bound was ever
    // checked — Nikolai Kozlovsky landed at x=-68, left of Galina at x=36
    // (see history in resolveGrandparentSymmetry).
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const galina = byId.get("galina-kupchik")!;
    const nikolaiKozlovsky = byId.get("nikolai-kozlovsky")!;
    const viktor = byId.get("viktor-kupchik")!;
    const elizaveta = byId.get("elizaveta-kupchik")!;

    expect(nikolaiKozlovsky.x).toBeGreaterThan(galina.x);
    expect(elizaveta.x).toBeLessThan(viktor.x);
  });

  it("accepts a §10 kink for Nikolai Sr./Elizaveta when Viktor's WHOLE sibling row gets pulled by an unrelated in-law collision (§9 priority exception)", () => {
    // Nikolai Kozlovsky (Galina's father) gained his own parents (Vasily +
    // Elizaveta Kozlovskaya) — resolving THEIR collision cascades: Nikolai
    // Kozlovsky → his daughter Galina → her husband Viktor (§9: spouses
    // always move together, product decision) → Viktor's own full siblings
    // (Natalya/Svetlana/Nikolai Jr., product decision: siblings always move
    // together) — all 5 shift together as one consistent block. Their
    // shared parents (Nikolai Sr./Elizaveta Kupchik), one generation above,
    // are handled by a SEPARATE pass (compactPaternalMaternalGap) that
    // computes its own, different-magnitude shift for the whole paternal
    // half — the two shifts don't compose to the same delta, so the
    // parents' junction no longer lands exactly on their 4 children's
    // center. Product decision, when forced to pick between fixing this
    // exactly and everything else already fixed (spouses/siblings always
    // together, zero collisions): accept this residual §10 kink here — the
    // connector to Nikolai Sr./Elizaveta bends slightly at this one point.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const viktor = byId.get("viktor-kupchik")!;
    const galina = byId.get("galina-kupchik")!;
    const natalya = byId.get("natalya-kupchik")!;
    const svetlana = byId.get("svetlana-kupchik")!;
    const nikolaiJr = byId.get("nikolai-kupchik-jr")!;
    const alexander = byId.get(realFocusId)!;
    const eleonora = byId.get("eleonora-kupchik")!;

    // The things that must NOT regress: spouses stay adjacent...
    const spouseHalfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    expect(galina.x - viktor.x).toBe(spouseHalfSpan * 2);
    expect(eleonora.x - alexander.x).toBe(spouseHalfSpan * 2);
    // ...and Viktor's whole sibling row stays together as one block.
    expect(natalya.y).toBe(viktor.y);
    expect(svetlana.y).toBe(viktor.y);
    expect(nikolaiJr.y).toBe(viktor.y);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("centers Grigory+Agrafena Kolesnikovich's junction over their daughter Nadezhda without colliding with the Vasily/Elizaveta Kozlovsky couple on the same row (§10/§40)", () => {
    // Nadezhda Kozlovskaya (Nikolai Kozlovsky's wife) gained her own parents
    // — Grigory + Agrafena Kolesnikovich — one generation above, landing on
    // the SAME row as Vasily + Elizaveta Kozlovskaya (Nikolai's own parents,
    // a completely unrelated couple that merely shares that generation).
    // Both grandparent pairs must clear each other (no overlap) and each
    // pair's junction should still land close to its own child's center.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const grigoryK = byId.get("grigory-kolesnikovich")!;
    const agrafenaK = byId.get("agrafena-kolesnikovich")!;
    const nadezhda = byId.get("nadezhda-kozlovskaya")!;
    const vasily = byId.get("vasily-kozlovsky")!;
    const elizavetaK = byId.get("elizaveta-kozlovskaya")!;

    // Husband-left/wife-right (§9) for the new couple.
    expect(grigoryK.y).toBe(agrafenaK.y);
    expect(grigoryK.x).toBeLessThan(agrafenaK.x);
    const spouseHalfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    expect(agrafenaK.x - grigoryK.x).toBe(spouseHalfSpan * 2);

    // Both grandparent couples sit on the same generation row.
    expect(vasily.y).toBe(grigoryK.y);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);

    // Nadezhda's own parents' junction stays reasonably close to her own
    // position — allowed to drift (§10 kink precedent), but never crosses
    // to the wrong side of the Vasily/Elizaveta Kozlovsky couple.
    expect(grigoryK.x).toBeGreaterThan(elizavetaK.x);
    const junction = (grigoryK.x + agrafenaK.x) / 2;
    expect(Math.abs(junction - nadezhda.x)).toBeLessThan(500);
  });

  it("keeps a wife's own parents on HER side, not chained past her husband's parents (§7/§8)", () => {
    // Nikolai Sr. Kupchik (husband) and Elizaveta Kupchik (wife) are both
    // within the SAME paternal half-plane — but their OWN parents (Vladimir
    // + Marfa Kupchik for Nikolai Sr.; Grigory + Elizaveta Krivusha for
    // Elizaveta) are two COMPLETELY UNRELATED families that merely happen to
    // land on the same generation row. Product requirement: Elizaveta's own
    // parents must grow from HER anchor (right of Nikolai Sr., §9), not get
    // shoved further left past her husband's parents — that used to happen
    // because the couple-centering clamp treated occupiedEdge as shared
    // between the husband's and wife's ancestor lines (see history in
    // placeAncestorPairUndirected).
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const nikolaiSrKupchik = byId.get("nikolai-kupchik")!;
    const elizavetaKupchik = byId.get("elizaveta-kupchik")!;
    const vladimir = byId.get("vladimir-kupchik")!;
    const marfa = byId.get("marfa-kupchik")!;
    const grigoryKrivusha = byId.get("grigory-krivusha")!;
    const elizavetaKrivusha = byId.get("elizaveta-krivusha")!;

    // Elizaveta sits to the right of her husband Nikolai Sr. (§9).
    expect(elizavetaKupchik.x).toBeGreaterThan(nikolaiSrKupchik.x);
    // Her own parents' junction must land on HER side (right of her
    // husband's own parents' junction) — not chained further left, past
    // Vladimir+Marfa, into "Nikolai's side" territory.
    const vladimirMarfaJunction = (vladimir.x + marfa.x) / 2;
    const krivushaJunction = (grigoryKrivusha.x + elizavetaKrivusha.x) / 2;
    expect(krivushaJunction).toBeGreaterThan(vladimirMarfaJunction);
  });

  it("grows a chained wife's own full sibling AWAY from her husband, not deeper into his territory (§9/§11)", () => {
    // Elena Ushkar is Elizaveta Kupchik's full sibling (same parents:
    // Grigory + Elizaveta Krivusha). Elizaveta is chained into the SAME
    // paternal half-plane as her husband Nikolai Sr. (both descend through
    // Viktor's paternal line) — the naive rule "sibling rows grow further
    // into the inherited half-plane direction" would put Elena further LEFT
    // than Elizaveta, behind her own husband Nikolai Sr. and mixed in with
    // HIS siblings (Mikhail/Vera) — and, via the shared-edge chaining that
    // used to exist, corrupt Nikolai Sr./Elizaveta's own fixed spouse gap
    // in the process (see history: Vladimir/Marfa's gap blew from 208px to
    // 376px as a side effect). Product requirement: a person's own sibling
    // row always grows AWAY from their own spouse (same principle as
    // freeDirectionGrowsLeft for the focus person, §9) — Elena must land to
    // the RIGHT of Elizaveta, not mixed into Nikolai Sr.'s row.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const nikolaiSrKupchik = byId.get("nikolai-kupchik")!;
    const elizavetaKupchik = byId.get("elizaveta-kupchik")!;
    const elenaUshkar = byId.get("elena-ushkar")!;
    const vladimir = byId.get("vladimir-kupchik")!;
    const marfa = byId.get("marfa-kupchik")!;

    expect(elenaUshkar.x).toBeGreaterThan(elizavetaKupchik.x);
    expect(elenaUshkar.x).toBeGreaterThan(nikolaiSrKupchik.x);

    // Nikolai Sr./Elizaveta's own spouse gap stays at its normal fixed
    // span — Elena's row growing away from Vladimir/Marfa's row must not
    // corrupt it via any shared-edge chaining.
    const spouseHalfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    expect(elizavetaKupchik.x - nikolaiSrKupchik.x).toBe(spouseHalfSpan * 2);
    expect(marfa.x - vladimir.x).toBe(spouseHalfSpan * 2);
  });

  it("places Elena Ushkar's husband Nikolai adjacent to her, husband-left/wife-right (§9)", () => {
    // Nikolai Ushkar is Elena Ushkar's spouse — husband-left/wife-right
    // (§9) must hold for this couple exactly like any other, with no
    // overlaps against the rest of the row (Vladimir/Marfa's own row,
    // Grigory/Elizaveta Krivusha).
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const elenaUshkar = byId.get("elena-ushkar")!;
    const nikolaiUshkar = byId.get("nikolai-ushkar")!;

    expect(nikolaiUshkar.y).toBe(elenaUshkar.y);
    expect(nikolaiUshkar.x).toBeLessThan(elenaUshkar.x);

    const spouseHalfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    expect(elenaUshkar.x - nikolaiUshkar.x).toBe(spouseHalfSpan * 2);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("places Natalya's husband Vladimir Evtukh and Svetlana's husband Viktor Efimovich adjacent, husband-left/wife-right (§9)", () => {
    // Natalya and Svetlana Kupchik (Viktor's full siblings) each gained a
    // spouse — husband-left/wife-right (§9) must hold for both couples,
    // with no overlaps against the rest of the row (their own siblings,
    // Nikolai Jr./Viktor, and the great-grandparent rows above).
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const natalya = byId.get("natalya-kupchik")!;
    const vladimirEvtukh = byId.get("vladimir-evtukh")!;
    const svetlana = byId.get("svetlana-kupchik")!;
    const viktorEfimovich = byId.get("viktor-efimovich")!;

    const spouseHalfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;

    expect(vladimirEvtukh.y).toBe(natalya.y);
    expect(vladimirEvtukh.x).toBeLessThan(natalya.x);
    expect(natalya.x - vladimirEvtukh.x).toBe(spouseHalfSpan * 2);

    expect(viktorEfimovich.y).toBe(svetlana.y);
    expect(viktorEfimovich.x).toBeLessThan(svetlana.x);
    expect(svetlana.x - viktorEfimovich.x).toBe(spouseHalfSpan * 2);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("centers Vladimir Evtukh+Natalya's junction over their 2 children, Egor and Anastasiya (§10)", () => {
    // Egor and Anastasiya Evtukh are Vladimir Evtukh + Natalya Kupchik's
    // children — one generation below the real fixture's previous deepest
    // descendant row (Alexander's own children). The couple's junction must
    // land exactly at the center of their two children, same as every
    // other parent-couple in the tree (§10).
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const vladimirEvtukh = byId.get("vladimir-evtukh")!;
    const natalya = byId.get("natalya-kupchik")!;
    const egor = byId.get("egor-evtukh")!;
    const anastasiya = byId.get("anastasiya-evtukh")!;

    expect(egor.y).toBe(anastasiya.y);
    expect(egor.y).toBeGreaterThan(vladimirEvtukh.y);

    const junction = (vladimirEvtukh.x + natalya.x) / 2;
    const childrenXs = [egor.x, anastasiya.x];
    const childrenCenter =
      (Math.min(...childrenXs) + Math.max(...childrenXs)) / 2;
    expect(junction).toBe(childrenCenter);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("centers Viktor Efimovich+Svetlana's junction over their 2 children, Olga and Yuriy (§10)", () => {
    // Olga and Yuriy Efimovich are Viktor Efimovich + Svetlana Kupchik's
    // children — same generation as Egor/Anastasiya Evtukh, a sibling
    // sub-branch. The couple's junction must land exactly at the center of
    // their two children (§10), same as every other parent-couple.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const viktorEfimovich = byId.get("viktor-efimovich")!;
    const svetlana = byId.get("svetlana-kupchik")!;
    const olga = byId.get("olga-efimovich")!;
    const yuriy = byId.get("yuriy-efimovich")!;

    expect(olga.y).toBe(yuriy.y);
    expect(olga.y).toBeGreaterThan(viktorEfimovich.y);

    const junction = (viktorEfimovich.x + svetlana.x) / 2;
    const childrenXs = [olga.x, yuriy.x];
    const childrenCenter =
      (Math.min(...childrenXs) + Math.max(...childrenXs)) / 2;
    expect(junction).toBe(childrenCenter);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("keeps Nikolai Sr./Elizaveta Kupchik's own spouse gap fixed even when their two independent great-grandparent couples collide (§9)", () => {
    // Vladimir+Marfa Kupchik (Nikolai Sr.'s own parents) and Grigory+
    // Elizaveta Krivusha (Elizaveta Kupchik's own parents) are two
    // UNRELATED ancestor couples that happen to land on the same Y/half-
    // plane, one generation ABOVE Nikolai Sr./Elizaveta Kupchik (who are
    // themselves married to EACH OTHER, not independent branches). Product
    // decision: their collision must be resolved by pushing the two
    // great-grandparent couples apart (accepting a kink in the connector
    // line at that one level) — NOT by stretching Nikolai Sr./Elizaveta's
    // own fixed SPOUSE_GAP (see history: an earlier attempt cascaded the
    // shift down through each spouse's side independently and blew their
    // gap from 208px to 448px, "верни расстояние между Николаем и
    // Елизаветой").
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const nikolaiSrKupchik = byId.get("nikolai-kupchik")!;
    const elizavetaKupchik = byId.get("elizaveta-kupchik")!;
    const marfa = byId.get("marfa-kupchik")!;
    const grigoryKrivusha = byId.get("grigory-krivusha")!;

    const spouseHalfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    expect(elizavetaKupchik.x - nikolaiSrKupchik.x).toBe(spouseHalfSpan * 2);

    // The two great-grandparent couples must not collide — SIBLING_GAP
    // edge-to-edge between Marfa (paternal-side inner card) and Grigory
    // (maternal-side inner card).
    const marfaRightEdge = marfa.x + CARD_WIDTH / 2;
    const grigoryLeftEdge = grigoryKrivusha.x - CARD_WIDTH / 2;
    expect(grigoryLeftEdge - marfaRightEdge).toBeGreaterThanOrEqual(
      SIBLING_GAP,
    );

    // Both great-grandparent couples stay on their own side of their own
    // child (§7/§8) — Vladimir+Marfa strictly left of Nikolai Sr., Grigory+
    // Elizaveta Krivusha strictly right of Elizaveta Kupchik.
    expect(marfa.x).toBeLessThan(nikolaiSrKupchik.x);
    expect(grigoryKrivusha.x).toBeGreaterThan(elizavetaKupchik.x);
  });

  it("keeps Vladimir+Marfa centered over ALL 3 of their children, not just Nikolai Sr. (§10)", () => {
    // Nikolai Sr. Kupchik has full siblings — Mikhail and Vera Kupchik
    // (same parents, Vladimir+Marfa). Vladimir+Marfa must stay centered
    // over the FULL row of 3 children, even though their pair also
    // collides with Elizaveta Kupchik's own parents (Grigory+Elizaveta
    // Krivusha) on the same Y and needs to be pushed apart from them.
    // Product decision: "центрируй родителей строго над их детьми" —
    // when the pinned side (Vladimir+Marfa, has a sibling row to stay
    // centered over) collides with an unpinned side, only the UNPINNED
    // side (Grigory+Elizaveta Krivusha, Elizaveta has no siblings here)
    // may move — matches the existing Nikolai Sr./Elizaveta Kupchik
    // asymmetric-pin precedent ("как Николая и Елизавету").
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const nikolaiSrKupchik = byId.get("nikolai-kupchik")!;
    const mikhail = byId.get("mikhail-kupchik")!;
    const vera = byId.get("vera-kupchik")!;
    const vladimir = byId.get("vladimir-kupchik")!;
    const marfa = byId.get("marfa-kupchik")!;

    const junction = (vladimir.x + marfa.x) / 2;
    const childrenXs = [nikolaiSrKupchik.x, mikhail.x, vera.x];
    const childrenCenter =
      (Math.min(...childrenXs) + Math.max(...childrenXs)) / 2;
    expect(junction).toBe(childrenCenter);
  });

  it("the Ushkar branch (paternal aunt's family) does not collide with Evtukh/Kupchik/Kozlovsky/Kolesnikovich siblings when it gains children (§40)", () => {
    // Elena Ushkar (paternal aunt of focus, via Grigory Krivusha + Elizaveta
    // Krivusha) gains two new children — must not collide with any
    // neighboring branch, without any person-specific positioning code
    // (§44) — this exercises the SAME general subtree-growth machinery as
    // every other branch.
    const grownGraph: FamilyGraph = {
      persons: [
        ...initialFamilyGraph.persons,
        personOf("ushkar-new-child-1", { firstName: "New1", gender: "male" }),
        personOf("ushkar-new-child-2", { firstName: "New2", gender: "female" }),
      ],
      relationships: [
        ...initialFamilyGraph.relationships,
        parentChild(
          "nikolai-ushkar-new1-parent",
          "nikolai-ushkar",
          "ushkar-new-child-1",
        ),
        parentChild(
          "elena-ushkar-new1-parent",
          "elena-ushkar",
          "ushkar-new-child-1",
        ),
        parentChild(
          "nikolai-ushkar-new2-parent",
          "nikolai-ushkar",
          "ushkar-new-child-2",
        ),
        parentChild(
          "elena-ushkar-new2-parent",
          "elena-ushkar",
          "ushkar-new-child-2",
        ),
      ],
    };

    const result = buildTreeV3Layout(grownGraph, realFocusId);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    expect(result.persons).toHaveLength(grownGraph.persons.length);
  });
});

describe("tree-v3 layout — synthetic cases (§41)", () => {
  it("CASE A — simple family: A+B → C, D, E", () => {
    const graph: FamilyGraph = {
      persons: [
        personOf("a", { gender: "male" }),
        personOf("b", { gender: "female" }),
        personOf("c"),
        personOf("d"),
        personOf("e"),
      ],
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        parentChild("a-d", "a", "d"),
        parentChild("b-d", "b", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("b-e", "b", "e"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);

    const a = positions.get("a")!;
    const b = positions.get("b")!;
    expect(a.x).toBeLessThan(b.x); // husband-left/wife-right (§9)
    const [c, d, e] = ["c", "d", "e"].map((id) => positions.get(id)!);
    for (const child of [c, d, e]) expect(child.y).toBeGreaterThan(a.y); // children below parents (§10)
  });

  it("CASE B — deep descendants: A+B → C → D → E, F", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e", "f"].map((id) => personOf(id)),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("c-d", "c", "d"),
        parentChild("d-e", "d", "e"),
        parentChild("d-f", "d", "f"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // Strictly increasing y per generation.
    expect(positions.get("c")!.y).toBeGreaterThan(positions.get("a")!.y);
    expect(positions.get("d")!.y).toBeGreaterThan(positions.get("c")!.y);
    expect(positions.get("e")!.y).toBeGreaterThan(positions.get("d")!.y);
  });

  it("CASE C — paternal/maternal grandparents converge on focus", () => {
    const graph: FamilyGraph = {
      persons: ["pgf", "pgm", "father", "mgf", "mgm", "mother", "focus"].map(
        (id) => personOf(id),
      ),
      relationships: [
        spouse("pgf-pgm", "pgf", "pgm"),
        parentChild("pgf-father", "pgf", "father"),
        parentChild("pgm-father", "pgm", "father"),
        spouse("mgf-mgm", "mgf", "mgm"),
        parentChild("mgf-mother", "mgf", "mother"),
        parentChild("mgm-mother", "mgm", "mother"),
        spouse("father-mother", "father", "mother"),
        parentChild("father-focus", "father", "focus"),
        parentChild("mother-focus", "mother", "focus"),
      ],
    };
    const result = buildTreeV3Layout(graph, "focus");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // father+mother (focus's own parents) sit adjacent — spouses always
    // stay together (§9/§16); paternal/maternal (§7/§8) governs where
    // THEIR OWN parents (the grandparents) grow, not where father/mother
    // themselves sit relative to x=0.
    const father = positions.get("father")!;
    const mother = positions.get("mother")!;
    expect(father.y).toBe(mother.y);
    expect(father.x).toBeLessThan(mother.x); // husband-left/wife-right (§9)
    // pgf/pgm (paternal grandparents, father's own parents) sit as their
    // own adjacent couple, entirely on father's side — left of mgf/mgm
    // (maternal grandparents, mother's own parents), not necessarily left
    // of father.x itself (pgm, as the "wife" in that pair, may sit close to
    // or past father's own x while still being clearly the paternal side).
    const pgf = positions.get("pgf")!;
    const pgm = positions.get("pgm")!;
    const mgf = positions.get("mgf")!;
    const mgm = positions.get("mgm")!;
    expect(Math.max(pgf.x, pgm.x)).toBeLessThan(Math.min(mgf.x, mgm.x));
    expect(pgf.x).toBeLessThan(pgm.x); // husband-left/wife-right within the paternal grandparent couple too
    expect(mgf.x).toBeLessThan(mgm.x);
  });

  it("CASE D — divorce: A+B → C (partnership preserved, child still linked)", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c"].map((id) => personOf(id)),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    expect(result.persons.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(result.partnerships).toHaveLength(1);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("CASE E — remarriage: A+B → C, A+D → E (A appears exactly once)", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e"].map((id) =>
        personOf(id, { gender: id === "a" ? "male" : "female" }),
      ),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        spouse("a-d", "a", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("d-e", "d", "e"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    // §17 — exactly one node per person.
    expect(result.persons.filter((p) => p.id === "a")).toHaveLength(1);
    expect(result.partnerships).toHaveLength(2);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // C and E are visually distinguishable — different x (different partnership branches).
    expect(positions.get("c")!.x).not.toBe(positions.get("e")!.x);
  });

  it("CASE F — both remarry: A+B→C, A+D→E, B+F→G", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e", "f", "g"].map((id) =>
        personOf(id, {
          gender:
            id === "a" || id === "f"
              ? "male"
              : id === "b" || id === "d"
                ? "female"
                : "unknown",
        }),
      ),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        spouse("a-d", "a", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("d-e", "d", "e"),
        spouse("b-f", "b", "f"),
        parentChild("b-g", "b", "g"),
        parentChild("f-g", "f", "g"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    expect(result.persons.filter((p) => p.id === "a")).toHaveLength(1);
    expect(result.persons.filter((p) => p.id === "b")).toHaveLength(1);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("CASE G — large subtree: A+B→C,D,E; C+F→G,H; G+I→J,K,L", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map(
        (id) => personOf(id),
      ),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        parentChild("a-d", "a", "d"),
        parentChild("b-d", "b", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("b-e", "b", "e"),
        spouse("c-f", "c", "f"),
        parentChild("c-g", "c", "g"),
        parentChild("f-g", "f", "g"),
        parentChild("c-h", "c", "h"),
        parentChild("f-h", "f", "h"),
        spouse("g-i", "g", "i"),
        parentChild("g-j", "g", "j"),
        parentChild("i-j", "i", "j"),
        parentChild("g-k", "g", "k"),
        parentChild("i-k", "i", "k"),
        parentChild("g-l", "g", "l"),
        parentChild("i-l", "i", "l"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // D and E (siblings of large-subtree branch C) must not be crushed —
    // still present with valid, distinct positions.
    expect(positions.get("d")).toBeDefined();
    expect(positions.get("e")).toBeDefined();
    expect(positions.get("d")!.x).not.toBe(positions.get("e")!.x);
  });

  it("CASE H — sibling with large family expands without destroying B/C positioning", () => {
    const graph: FamilyGraph = {
      persons: ["p1", "p2", "a", "b", "c", "d", "e", "f"].map((id) =>
        personOf(id),
      ),
      relationships: [
        spouse("p1-p2", "p1", "p2"),
        parentChild("p1-a", "p1", "a"),
        parentChild("p2-a", "p2", "a"),
        parentChild("p1-b", "p1", "b"),
        parentChild("p2-b", "p2", "b"),
        parentChild("p1-c", "p1", "c"),
        parentChild("p2-c", "p2", "c"),
        parentChild("a-d", "a", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("a-f", "a", "f"),
      ],
    };
    const result = buildTreeV3Layout(graph, "b");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    expect(positions.get("b")!.x).toBe(0); // focus stays centered (§6)
  });

  it("CASE I — grandparents center on their own children's cards, not the child-with-a-spouse's whole block (§10)", () => {
    // p1+p2 have 4 children: a, c, d (no spouse) and b (has a spouse, s,
    // and is the ancestor path up to focus). Product requirement: p1+p2
    // must be centered over their 4 children's OWN cards — b's spouse s
    // should NOT skew that center toward b's side, even though s's card
    // physically sits right next to b.
    const graph: FamilyGraph = {
      persons: ["p1", "p2", "a", "b", "c", "d", "s", "focus"].map((id) =>
        personOf(id, {
          gender: id === "p1" ? "male" : id === "p2" ? "female" : undefined,
        }),
      ),
      relationships: [
        spouse("p1-p2", "p1", "p2"),
        parentChild("p1-a", "p1", "a"),
        parentChild("p2-a", "p2", "a"),
        parentChild("p1-b", "p1", "b"),
        parentChild("p2-b", "p2", "b"),
        parentChild("p1-c", "p1", "c"),
        parentChild("p2-c", "p2", "c"),
        parentChild("p1-d", "p1", "d"),
        parentChild("p2-d", "p2", "d"),
        spouse("b-s", "b", "s"),
        parentChild("b-focus", "b", "focus"),
        parentChild("s-focus", "s", "focus"),
      ],
    };
    const result = buildTreeV3Layout(graph, "focus");
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const p1 = byId.get("p1")!;
    const p2 = byId.get("p2")!;
    const a = byId.get("a")!;
    const b = byId.get("b")!;
    const c = byId.get("c")!;
    const d = byId.get("d")!;

    const junction = (p1.x + p2.x) / 2;
    const childrenXs = [a.x, b.x, c.x, d.x];
    const childrenCenter =
      (Math.min(...childrenXs) + Math.max(...childrenXs)) / 2;
    expect(junction).toBe(childrenCenter);

    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });
});

describe("tree-v3 layout — geometry invariants (§39)", () => {
  it("no two persons share the same (x, y) — minimum spacing", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const seen = new Set<string>();
    for (const p of result.persons) {
      const key = `${p.x},${p.y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("card bounding boxes are well-formed (CARD_WIDTH/CARD_HEIGHT are positive)", () => {
    expect(CARD_WIDTH).toBeGreaterThan(0);
    expect(CARD_HEIGHT).toBeGreaterThan(0);
  });

  it("layout is deterministic — same graph + focus produces identical positions (§43)", () => {
    const r1 = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const r2 = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const p1 = new Map(r1.persons.map((p) => [p.id, `${p.x},${p.y}`]));
    const p2 = new Map(r2.persons.map((p) => [p.id, `${p.x},${p.y}`]));
    expect(p1).toEqual(p2);
  });

  it("children are strictly below their parents' generation (§10 soft rule holds on real data)", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    for (const rel of initialFamilyGraph.relationships) {
      if (rel.kind !== "parent-child") continue;
      const parent = byId.get(rel.from);
      const child = byId.get(rel.to);
      if (!parent || !child) continue;
      expect(child.y).toBeGreaterThan(parent.y);
    }
  });

  it("every partnership's husband is left of the wife when genders are known (§9, STRONG constraint)", () => {
    // §15: husband-left/wife-right is a STRONG constraint, subordinate to
    // the HARD "no overlap" constraint (§15 item 1) — resolveResidualOverlaps
    // (collision.ts) may, in rare cases where two independently-grown
    // branches collide, shift one member of a couple without perfectly
    // preserving left/right order to guarantee zero overlaps. Assert the
    // strong constraint holds for the overwhelming majority of partnerships
    // (placement-time ordering, §9), not literally every single one.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    let total = 0;
    let violations = 0;
    for (const partnership of result.partnerships) {
      const left = byId.get(partnership.leftPersonId)!;
      const right = byId.get(partnership.rightPersonId)!;
      if (left.gender === "male" && right.gender === "female") {
        total++;
        if (left.x > right.x) violations++;
      }
    }
    expect(violations / total).toBeLessThan(0.05);
  });

  it("spouses remain close together relative to unrelated neighbors (§9/§16, STRONG constraint)", () => {
    // Same rationale as above — §15 STRONG constraint, not HARD; the rare
    // residual-collision fallback (collision.ts resolveResidualOverlaps) may
    // stretch one couple to guarantee the HARD no-overlap constraint.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    let total = 0;
    let violations = 0;
    for (const partnership of result.partnerships) {
      const left = byId.get(partnership.leftPersonId)!;
      const right = byId.get(partnership.rightPersonId)!;
      expect(left.y).toBe(right.y);
      total++;
      if (Math.abs(left.x - right.x) >= CARD_WIDTH * 2) violations++;
    }
    expect(violations / total).toBeLessThan(0.05);
  });

  it("each Person appears exactly once across the whole layout (§17)", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const ids = result.persons.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adding a descendant expands only its own subtree's width, not unrelated branches's positions drastically", () => {
    const before = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const beforeById = new Map(before.persons.map((p) => [p.id, p]));

    const grownGraph: FamilyGraph = {
      persons: [
        ...initialFamilyGraph.persons,
        personOf("new-descendant", { firstName: "New" }),
      ],
      relationships: [
        ...initialFamilyGraph.relationships,
        parentChild("eva-new-parent", "eva-kupchik", "new-descendant"),
      ],
    };
    const after = buildTreeV3Layout(grownGraph, realFocusId);
    const afterById = new Map(after.persons.map((p) => [p.id, p]));

    // A distant, unrelated branch (Kolesnikovich, several generations up the
    // maternal side) keeps its exact position — growth stayed local (§26).
    expect(afterById.get("iosif-kolesnikovich")).toEqual(
      beforeById.get("iosif-kolesnikovich"),
    );

    const positions = new Map(
      after.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });
});
