import { describe, expect, it } from "vitest";
import { buildFocusTreeLayout, type PersonNode } from "./tree-layout.builder";

function person(id: string, overrides: Partial<PersonNode> = {}): PersonNode {
  return {
    id,
    slug: id,
    firstName: id,
    lastName: null,
    nickname: null,
    isPlaceholder: false,
    isLiving: true,
    birthYear: null,
    deathYear: null,
    photoMediaId: null,
    gender: "unknown",
    religion: null,
    nationality: null,
    ...overrides,
  };
}

describe("buildFocusTreeLayout", () => {
  it("returns an empty graph when the focus person doesn't exist", () => {
    const result = buildFocusTreeLayout({
      persons: [person("a")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "missing",
    });
    expect(result).toEqual({ nodes: [], edges: [], focusPersonId: "missing" });
  });

  it("includes just the focus person when they have no relatives", () => {
    const result = buildFocusTreeLayout({
      persons: [person("alice")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "alice",
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: "alice",
      generation: 0,
      isFocus: true,
    });
    expect(result.edges).toEqual([]);
  });

  it("places parents at generation -1 and children at generation +1", () => {
    const result = buildFocusTreeLayout({
      persons: [
        person("mother"),
        person("father"),
        person("alice"),
        person("child"),
      ],
      parentChildEdges: [
        { parentId: "mother", childId: "alice" },
        { parentId: "father", childId: "alice" },
        { parentId: "alice", childId: "child" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get("mother")?.generation).toBe(-1);
    expect(byId.get("father")?.generation).toBe(-1);
    expect(byId.get("alice")?.generation).toBe(0);
    expect(byId.get("child")?.generation).toBe(1);
  });

  it("places grandparents at generation -2 within the default 2-generation range", () => {
    const result = buildFocusTreeLayout({
      persons: [person("grandparent"), person("parent"), person("alice")],
      parentChildEdges: [
        { parentId: "grandparent", childId: "parent" },
        { parentId: "parent", childId: "alice" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get("grandparent")?.generation).toBe(-2);
  });

  it("excludes generations beyond the requested ancestorGenerations/descendantGenerations", () => {
    const result = buildFocusTreeLayout({
      persons: [
        person("great-grandparent"),
        person("grandparent"),
        person("parent"),
        person("alice"),
      ],
      parentChildEdges: [
        { parentId: "great-grandparent", childId: "grandparent" },
        { parentId: "grandparent", childId: "parent" },
        { parentId: "parent", childId: "alice" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
      ancestorGenerations: 2,
    });

    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain("great-grandparent");
    expect(ids).toContain("grandparent");
  });

  it("includes a partner at the same generation as their partnered person", () => {
    const result = buildFocusTreeLayout({
      persons: [person("alice"), person("spouse")],
      parentChildEdges: [],
      partnershipEdges: [
        { person1Id: "alice", person2Id: "spouse", isCurrent: true },
      ],
      focusPersonId: "alice",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get("spouse")?.generation).toBe(0);
    expect(result.edges).toContainEqual(
      expect.objectContaining({
        kind: "partnership",
        source: "alice",
        target: "spouse",
      }),
    );
  });

  it("only emits edges where both endpoints are within the visible slice", () => {
    // grandparent -> parent -> alice -> child -> grandchild(too far, excluded with generations=1)
    const result = buildFocusTreeLayout({
      persons: [
        person("parent"),
        person("alice"),
        person("child"),
        person("grandchild"),
      ],
      parentChildEdges: [
        { parentId: "parent", childId: "alice" },
        { parentId: "alice", childId: "child" },
        { parentId: "child", childId: "grandchild" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
      descendantGenerations: 1,
    });

    const edgeIds = result.edges.map((e) => e.id);
    expect(edgeIds).toContain("pc-alice-child");
    expect(edgeIds).not.toContain("pc-child-grandchild"); // grandchild excluded, edge must not dangle
  });

  it("keeps siblings distinct nodes at the same generation with different x", () => {
    const result = buildFocusTreeLayout({
      persons: [person("mother"), person("alice"), person("bob")],
      parentChildEdges: [
        { parentId: "mother", childId: "alice" },
        { parentId: "mother", childId: "bob" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get("alice")?.generation).toBe(0);
    expect(byId.get("bob")?.generation).toBe(0);
    expect(byId.get("alice")?.x).not.toBe(byId.get("bob")?.x);
  });

  it("marks exactly one node as isFocus", () => {
    const result = buildFocusTreeLayout({
      persons: [person("mother"), person("alice")],
      parentChildEdges: [{ parentId: "mother", childId: "alice" }],
      partnershipEdges: [],
      focusPersonId: "alice",
    });

    expect(result.nodes.filter((n) => n.isFocus)).toHaveLength(1);
    expect(result.nodes.find((n) => n.isFocus)?.id).toBe("alice");
  });

  it("includes an ancestor's siblings (great-aunt/uncle), not just the focus person's own siblings", () => {
    // greatGrandparent -> {grandparent, grandparentsSibling}; grandparent -> parent -> alice.
    // From alice's perspective, grandparentsSibling is a side-branch off an
    // ANCESTOR (grandparent), not off alice directly — the old single-pass
    // sibling logic (keyed only to focusPersonId) never found this.
    const result = buildFocusTreeLayout({
      persons: [
        person("greatGrandparent"),
        person("grandparent"),
        person("grandparentsSibling"),
        person("parent"),
        person("alice"),
      ],
      parentChildEdges: [
        { parentId: "greatGrandparent", childId: "grandparent" },
        { parentId: "greatGrandparent", childId: "grandparentsSibling" },
        { parentId: "grandparent", childId: "parent" },
        { parentId: "parent", childId: "alice" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });

    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain("grandparentsSibling");
    expect(
      result.nodes.find((n) => n.id === "grandparentsSibling")?.generation,
    ).toBe(-2);
  });

  it("shows the same connected family whether focus is an ancestor or a descendant", () => {
    // viktor -- galina (partners), their child alexander, alexander's sibling eleonora,
    // and viktor's own sibling viktorsSibling (a side-branch off viktor, not off alexander).
    const persons = [
      person("viktor"),
      person("galina"),
      person("viktorsSibling"),
      person("alexander"),
      person("eleonora"),
    ];
    const parentChildEdges = [
      { parentId: "viktor", childId: "alexander" },
      { parentId: "galina", childId: "alexander" },
      { parentId: "viktor", childId: "eleonora" },
      { parentId: "galina", childId: "eleonora" },
    ];
    const partnershipEdges = [
      { person1Id: "viktor", person2Id: "galina", isCurrent: true },
    ];
    // viktorsSibling shares a parent with viktor — give both a common parent
    // so deriveSiblings-style logic (here: the parentsOf/childrenOf sibling
    // expansion) finds them.
    const withGrandparent = {
      persons: [...persons, person("greatGrandparent")],
      parentChildEdges: [
        ...parentChildEdges,
        { parentId: "greatGrandparent", childId: "viktor" },
        { parentId: "greatGrandparent", childId: "viktorsSibling" },
      ],
      partnershipEdges,
    };

    const fromViktor = buildFocusTreeLayout({
      ...withGrandparent,
      focusPersonId: "viktor",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });
    const fromAlexander = buildFocusTreeLayout({
      ...withGrandparent,
      focusPersonId: "alexander",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });

    const idsFromViktor = new Set(fromViktor.nodes.map((n) => n.id));
    const idsFromAlexander = new Set(fromAlexander.nodes.map((n) => n.id));
    expect(idsFromViktor).toEqual(idsFromAlexander);
    expect(idsFromAlexander.has("viktorsSibling")).toBe(true);
  });

  it("includes a partner's own ancestors, not just the partner card itself", () => {
    // alice's own line: parent -> alice. alice's partner (bob) has his own
    // parents (bobsMother, bobsFather) who are never anywhere in alice's
    // ancestor chain — they only connect to the visible graph THROUGH bob,
    // who himself was only ever added by the partnership-join pass, not by
    // the ancestor/descendant BFS. The old code ran that BFS exactly once,
    // from focusPersonId, before partners were even known about — so bob's
    // own parents could never be discovered no matter how many sibling/
    // partner passes ran afterward. This reproduces the reported screenshot
    // bug: a partner card (e.g. Марфа Купчик) rendered with no parents at all.
    const result = buildFocusTreeLayout({
      persons: [
        person("parent"),
        person("alice"),
        person("bob"),
        person("bobsMother"),
        person("bobsFather"),
      ],
      parentChildEdges: [
        { parentId: "parent", childId: "alice" },
        { parentId: "bobsMother", childId: "bob" },
        { parentId: "bobsFather", childId: "bob" },
      ],
      partnershipEdges: [
        { person1Id: "alice", person2Id: "bob", isCurrent: true },
      ],
      focusPersonId: "alice",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });

    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain("bobsMother");
    expect(ids).toContain("bobsFather");
    expect(result.nodes.find((n) => n.id === "bobsMother")?.generation).toBe(
      -1,
    );
  });

  it("keeps a married couple's own ancestor fans centered on each spouse: husband's line fans left, wife's fans right", () => {
    // viktor's parents are motherA/fatherA; galina's parents are a wholly
    // separate couple, motherB/fatherB. viktor and galina are married — at
    // LEAST PARTNER_X_SPACING apart (widened further when both spouses'
    // own ancestor fans would otherwise collide in the middle — see below)
    // — and each spouse's own ancestor line fans out to their OWN side:
    // viktor's parents end up to viktor's left, galina's parents to
    // galina's right, and the two fans never share an x range (see file
    // header comment's ANCESTOR LAYOUT MODEL).
    //
    // Both spouses here have their own visible parent fan, so the two fans
    // meet in the middle with no natural gap between them — splitting that
    // separation between both sides (rather than viktor's own fan alone
    // absorbing the full push) is what keeps EACH fan centered close to
    // its own person instead of one drifting a full PARTNER_X_SPACING away
    // from viktor purely because his fan happened to be placed second (a
    // real reported bug: Виктор's own parents ended up centered under
    // where his SISTER stood instead of under him).
    const result = buildFocusTreeLayout({
      persons: [
        person("motherA", { gender: "female" }),
        person("fatherA", { gender: "male" }),
        person("viktor", { gender: "male" }),
        person("motherB", { gender: "female" }),
        person("fatherB", { gender: "male" }),
        person("galina", { gender: "female" }),
      ],
      parentChildEdges: [
        { parentId: "motherA", childId: "viktor" },
        { parentId: "fatherA", childId: "viktor" },
        { parentId: "motherB", childId: "galina" },
        { parentId: "fatherB", childId: "galina" },
      ],
      partnershipEdges: [
        { person1Id: "motherA", person2Id: "fatherA", isCurrent: true },
        { person1Id: "motherB", person2Id: "fatherB", isCurrent: true },
        { person1Id: "viktor", person2Id: "galina", isCurrent: true },
      ],
      focusPersonId: "viktor",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    const viktor = byId.get("viktor")!;
    const galina = byId.get("galina")!;
    const motherA = byId.get("motherA")!;
    const fatherA = byId.get("fatherA")!;
    const motherB = byId.get("motherB")!;
    const fatherB = byId.get("fatherB")!;

    // Husband left, wife right, at least the plain per-card spacing apart
    // (never LESS — widened only as far as needed to give both ancestor
    // fans room).
    expect(galina.x - viktor.x).toBeGreaterThanOrEqual(260);
    // viktor's own parents sit on viktor's side (left of galina)...
    expect(fatherA.x).toBeLessThan(galina.x);
    expect(motherA.x).toBeLessThan(galina.x);
    // ...galina's own parents sit on galina's side (right of viktor —
    // motherB can legitimately land exactly AT viktor's own x, since
    // they're a different generation and PARTNER_X_SPACING is still
    // respected against viktor's own fan; never further left, i.e. never
    // crossing into viktor's own side).
    expect(fatherB.x).toBeGreaterThan(viktor.x);
    expect(motherB.x).toBeGreaterThanOrEqual(viktor.x);

    // Each fan stays reasonably CENTERED on its own person — the actual
    // regression this test guards against — not dragged off toward the
    // other spouse's side.
    const fanACenter = (motherA.x + fatherA.x) / 2;
    const fanBCenter = (motherB.x + fatherB.x) / 2;
    expect(Math.abs(fanACenter - viktor.x)).toBeLessThan(200);
    expect(Math.abs(fanBCenter - galina.x)).toBeLessThan(200);
  });

  it("places a person's own siblings beside them, not off in the ancestor fan", () => {
    // parent has two children: alice (focus, partnered with aliceSpouse)
    // and bob (alice's sibling, unpartnered). alice's own ancestor fan
    // (through `parent`) is a separate concern from bob riding beside her.
    const result = buildFocusTreeLayout({
      persons: [
        person("parent"),
        person("alice"),
        person("aliceSpouse"),
        person("bob"),
      ],
      parentChildEdges: [
        { parentId: "parent", childId: "alice" },
        { parentId: "parent", childId: "bob" },
      ],
      partnershipEdges: [
        { person1Id: "alice", person2Id: "aliceSpouse", isCurrent: true },
      ],
      focusPersonId: "alice",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    const alice = byId.get("alice")!;
    const aliceSpouse = byId.get("aliceSpouse")!;
    const bob = byId.get("bob")!;

    // All three at the focus's own generation, all distinct x positions.
    expect(bob.generation).toBe(0);
    expect(new Set([alice.x, aliceSpouse.x, bob.x]).size).toBe(3);
    // Regression: alice and her spouse must stay exactly the plain per-card
    // gap apart regardless of alice having a sibling — the sibling must
    // never land ON aliceSpouse's position (it did, before this was fixed:
    // both independently computed relativeX 122, since alice's own row
    // centered her sibling toward the couple's center instead of pushing
    // them away from it).
    expect(Math.abs(aliceSpouse.x - alice.x)).toBe(260);
    // bob must sit on alice's OUTER side (away from her spouse), not between them.
    expect(Math.abs(bob.x - alice.x)).toBeLessThan(
      Math.abs(bob.x - aliceSpouse.x),
    );
  });

  it("includes a sibling's own partner, not just the sibling themself", () => {
    // Reproduces the reported bug: focus (elenaSibling) is one of two
    // children of parent1+parent2; the OTHER child, elena, has her own
    // partner (nikolai) who has no other connection to the family at all.
    // elena herself is discovered only as elenaSibling's sibling (never
    // focus, never anyone's ancestor/descendant) — nikolai must still show
    // up beside her, because a sibling is a full person with their own
    // partner, not a dead end.
    const result = buildFocusTreeLayout({
      persons: [
        person("parent1"),
        person("parent2"),
        person("elenaSibling"),
        person("elena"),
        person("nikolai"),
      ],
      parentChildEdges: [
        { parentId: "parent1", childId: "elenaSibling" },
        { parentId: "parent2", childId: "elenaSibling" },
        { parentId: "parent1", childId: "elena" },
        { parentId: "parent2", childId: "elena" },
      ],
      partnershipEdges: [
        { person1Id: "parent1", person2Id: "parent2", isCurrent: true },
        { person1Id: "nikolai", person2Id: "elena", isCurrent: true },
      ],
      focusPersonId: "elenaSibling",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.has("elena")).toBe(true);
    expect(byId.has("nikolai")).toBe(true);
    // nikolai rides at elena's own generation, immediately beside her.
    expect(byId.get("nikolai")!.generation).toBe(byId.get("elena")!.generation);
    expect(Math.abs(byId.get("nikolai")!.x - byId.get("elena")!.x)).toBe(260);
  });

  it("keeps husband-left/wife-right for a sibling's own partner even when the sibling row grows toward the husband's gender side", () => {
    // Reproduces the reported follow-up bug (and its later real-data
    // correction). grandpa+grandma have two daughters: elizaveta (male
    // partner nikolaiKupchik) and elena (male partner nikolaiUshkar) — the
    // focus is a grandchild of elizaveta, so elizaveta is discovered as a
    // "root" (via elizaveta+nikolaiKupchik's own children), elena only as
    // elizaveta's OWN sibling.
    // elizaveta (female) + nikolaiKupchik (male): pure gender order puts
    // nikolaiKupchik at partnerSide -1 (male left of female) — so
    // siblingDirection (opposite of partnerSide) pushes elena to +1 (right
    // of elizaveta). elena's own partner nikolaiUshkar (male) + elena
    // (female): "муж слева, жена справа" is the higher-priority invariant
    // (confirmed against real production data — see git history for the
    // Вера/Владимир Артюх case an earlier version of this test's own
    // expectations got backwards), so nikolaiUshkar must land to elena's
    // OWN left — i.e. BETWEEN elizaveta and elena in x, not past elena —
    // while still keeping a full PARTNER_X_SPACING clear of elizaveta
    // (collision resolution's job, not gender order's).
    const result = buildFocusTreeLayout({
      persons: [
        person("grandpa", { gender: "male" }),
        person("grandma", { gender: "female" }),
        person("elizaveta", { gender: "female" }),
        person("nikolaiKupchik", { gender: "male" }),
        person("elena", { gender: "female" }),
        person("nikolaiUshkar", { gender: "male" }),
        person("kid", { gender: "unknown" }),
      ],
      parentChildEdges: [
        { parentId: "grandpa", childId: "elizaveta" },
        { parentId: "grandma", childId: "elizaveta" },
        { parentId: "grandpa", childId: "elena" },
        { parentId: "grandma", childId: "elena" },
        { parentId: "elizaveta", childId: "kid" },
        { parentId: "nikolaiKupchik", childId: "kid" },
      ],
      partnershipEdges: [
        { person1Id: "grandpa", person2Id: "grandma", isCurrent: true },
        {
          person1Id: "elizaveta",
          person2Id: "nikolaiKupchik",
          isCurrent: true,
        },
        { person1Id: "elena", person2Id: "nikolaiUshkar", isCurrent: true },
      ],
      focusPersonId: "kid",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.has("elena")).toBe(true);
    expect(byId.has("nikolaiUshkar")).toBe(true);

    // Husband-left/wife-right holds for BOTH couples: nikolaiKupchik left
    // of elizaveta, AND nikolaiUshkar left of elena — even though that
    // means nikolaiUshkar sits between elizaveta and elena, not past both.
    const order = ["nikolaiKupchik", "elizaveta", "nikolaiUshkar", "elena"]
      .map((id) => byId.get(id)!.x)
      .every((x, i, arr) => i === 0 || x > arr[i - 1]);
    expect(order).toBe(true);

    // No two cards at the same generation collide (each at least
    // PARTNER_X_SPACING=260 apart from its neighbor) — the reported bug put
    // nikolaiUshkar only 20 apart from elizaveta; collision resolution must
    // still keep a full gap here even with nikolaiUshkar on elena's inward
    // side.
    const sameGen = result.nodes
      .filter((n) => n.generation === byId.get("elizaveta")!.generation)
      .sort((a, b) => a.x - b.x);
    for (let i = 1; i < sameGen.length; i++) {
      expect(sameGen[i].x - sameGen[i - 1].x).toBeGreaterThanOrEqual(260);
    }
  });

  it("keeps the couple adjacent no matter how many siblings either spouse has", () => {
    // viktor has two siblings (viktorSib1, viktorSib2); galina has three
    // (galinaSib1..3) — a deliberately lopsided case. Regardless of how
    // wide either side's own sibling row grows, viktor and galina
    // themselves must stay exactly PARTNER_X_SPACING apart — the key
    // requirement: siblings never affect the couple's own gap, however
    // many there are on either side.
    const result = buildFocusTreeLayout({
      persons: [
        person("parent1"),
        person("viktor"),
        person("viktorSib1"),
        person("viktorSib2"),
        person("parent2"),
        person("galina"),
        person("galinaSib1"),
        person("galinaSib2"),
        person("galinaSib3"),
      ],
      parentChildEdges: [
        { parentId: "parent1", childId: "viktor" },
        { parentId: "parent1", childId: "viktorSib1" },
        { parentId: "parent1", childId: "viktorSib2" },
        { parentId: "parent2", childId: "galina" },
        { parentId: "parent2", childId: "galinaSib1" },
        { parentId: "parent2", childId: "galinaSib2" },
        { parentId: "parent2", childId: "galinaSib3" },
      ],
      partnershipEdges: [
        { person1Id: "viktor", person2Id: "galina", isCurrent: true },
      ],
      focusPersonId: "viktor",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    const viktor = byId.get("viktor")!;
    const galina = byId.get("galina")!;

    expect(Math.abs(galina.x - viktor.x)).toBe(260);

    // No two people at the SAME generation (i.e. the same visual row) share
    // an x position — a shared x across different rows is fine (they don't
    // occupy the same visual slot), so this checks per-generation, not globally.
    const xByGeneration = new Map<number, number[]>();
    for (const node of result.nodes) {
      if (!xByGeneration.has(node.generation))
        xByGeneration.set(node.generation, []);
      xByGeneration.get(node.generation)!.push(node.x);
    }
    for (const [, xValues] of xByGeneration) {
      expect(new Set(xValues).size).toBe(xValues.length);
    }
  });

  it("doesn't collide a descendant's spouse's own ancestors with the focus's own ancestor line", () => {
    // Reproduces the reported screenshot bug: focus's own grandparent sits
    // at generation -2. focus's GRANDCHILD's spouse has their own two-
    // generation-deep ancestor line (spouseParent -> spouseGrandparent),
    // which — because it's anchored off the grandchild's OWN generation
    // (+2), not off focus directly — lands at generation +1 and 0
    // respectively... except spouseGrandparent (generation 0) shares that
    // generation with `focus` itself, and (in the pre-fix version of this
    // model) with any sibling units at that same level — an in-law's
    // ancestors reached through a much deeper descendant line, at the same
    // generation number as unrelated people already placed there, must
    // still get their own reserved, non-overlapping width.
    const result = buildFocusTreeLayout({
      persons: [
        person("grandparent"),
        person("parent"),
        person("focus"),
        person("child"),
        person("grandchild"),
        person("grandchildSpouse"),
        person("spouseParent"),
        person("spouseGrandparent"),
      ],
      parentChildEdges: [
        { parentId: "grandparent", childId: "parent" },
        { parentId: "parent", childId: "focus" },
        { parentId: "focus", childId: "child" },
        { parentId: "child", childId: "grandchild" },
        { parentId: "spouseParent", childId: "grandchildSpouse" },
        { parentId: "spouseGrandparent", childId: "spouseParent" },
      ],
      partnershipEdges: [
        {
          person1Id: "grandchild",
          person2Id: "grandchildSpouse",
          isCurrent: true,
        },
      ],
      focusPersonId: "focus",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get("grandparent")?.generation).toBe(-2);
    expect(byId.get("spouseGrandparent")?.generation).toBe(0);

    // No two people at the same generation share an x position — this is
    // the actual regression check: spouseGrandparent (generation 0) must
    // not land on top of `focus` (also generation 0).
    const xByGeneration = new Map<number, number[]>();
    for (const node of result.nodes) {
      if (!xByGeneration.has(node.generation))
        xByGeneration.set(node.generation, []);
      xByGeneration.get(node.generation)!.push(node.x);
    }
    for (const [, xValues] of xByGeneration) {
      expect(new Set(xValues).size).toBe(xValues.length);
    }
  });

  it("doesn't collide a child's spouse's own parents with the focus's own partner", () => {
    // Reproduces a second real bug (mergeExtent's offset argument was
    // wrong — it recorded a placed piece's occupied range using the EXTRA
    // push beyond its desired position instead of its actual final
    // position, so a piece placed with NO collision at all — like
    // galina, viktor's own partner, placed at her first-requested spot —
    // was recorded in `extent` as if it were still at relativeX 0,
    // letting a LATER piece's collision check walk straight through
    // where galina actually sits). viktor+galina's own child aleksandr
    // partners with eleonora, whose own parents (iosif/filip) must not
    // land on top of galina.
    const result = buildFocusTreeLayout({
      persons: [
        person("viktor", { gender: "male" }),
        person("galina", { gender: "female" }),
        person("aleksandr", { gender: "male" }),
        person("eleonora", { gender: "female" }),
        person("iosif"),
        person("filip"),
        person("eva"),
      ],
      parentChildEdges: [
        { parentId: "viktor", childId: "aleksandr" },
        { parentId: "galina", childId: "aleksandr" },
        { parentId: "iosif", childId: "eleonora" },
        { parentId: "filip", childId: "eleonora" },
        { parentId: "aleksandr", childId: "eva" },
        { parentId: "eleonora", childId: "eva" },
      ],
      partnershipEdges: [
        { person1Id: "viktor", person2Id: "galina", isCurrent: true },
        { person1Id: "aleksandr", person2Id: "eleonora", isCurrent: true },
        { person1Id: "iosif", person2Id: "filip", isCurrent: true },
      ],
      focusPersonId: "viktor",
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
    });

    const xByGeneration = new Map<number, number[]>();
    for (const node of result.nodes) {
      if (!xByGeneration.has(node.generation))
        xByGeneration.set(node.generation, []);
      xByGeneration.get(node.generation)!.push(node.x);
    }
    for (const [, xValues] of xByGeneration) {
      expect(new Set(xValues).size).toBe(xValues.length);
    }
  });

  describe("multiple partnerships", () => {
    it("shows all of a person's partners at once, each with their own shared children centered under them", () => {
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("partnerB", { gender: "female" }),
          person("child1"),
          person("child2"),
        ],
        parentChildEdges: [
          { parentId: "root", childId: "child1" },
          { parentId: "partnerA", childId: "child1" },
          { parentId: "root", childId: "child2" },
          { parentId: "partnerB", childId: "child2" },
        ],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: false },
          { person1Id: "root", person2Id: "partnerB", isCurrent: true },
        ],
        focusPersonId: "root",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      // Both partners are present as their own nodes — neither overwrites the other.
      expect(byId.has("partnerA")).toBe(true);
      expect(byId.has("partnerB")).toBe(true);
      expect(byId.get("partnerA")?.generation).toBe(0);
      expect(byId.get("partnerB")?.generation).toBe(0);

      const rootX = byId.get("root")!.x;
      const partnerAX = byId.get("partnerA")!.x;
      const partnerBX = byId.get("partnerB")!.x;
      const child1X = byId.get("child1")!.x;
      const child2X = byId.get("child2")!.x;

      // child1 (root+partnerA's own child) is centered under (root, partnerA)'s
      // own midpoint, NOT under (root, partnerB)'s.
      expect(child1X).toBeCloseTo((rootX + partnerAX) / 2);
      // child2 (root+partnerB's own child) is centered under (root, partnerB)'s
      // own midpoint, NOT under (root, partnerA)'s.
      expect(child2X).toBeCloseTo((rootX + partnerBX) / 2);
      expect(child1X).not.toBeCloseTo((rootX + partnerBX) / 2);
    });

    it("keeps both partnership edges — none dropped when overwriting a single-partner map", () => {
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("partnerB", { gender: "female" }),
        ],
        parentChildEdges: [],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: false },
          { person1Id: "root", person2Id: "partnerB", isCurrent: true },
        ],
        focusPersonId: "root",
      });

      const partnershipEdges = result.edges.filter(
        (e) => e.kind === "partnership",
      );
      expect(partnershipEdges).toHaveLength(2);
      const partnerIds = partnershipEdges
        .map((e) => (e.source === "root" ? e.target : e.source))
        .sort();
      expect(partnerIds).toEqual(["partnerA", "partnerB"]);
    });

    it("keeps the CURRENT spouse in the tight adjacent slot even when an ex-partner's DB row comes first", () => {
      // "если у человека две жены то та на которой он женат должна быть
      // рядом" — the current marriage (isCurrent: true) must claim the
      // tight PARTNER_X_SPACING adjacency slot regardless of which
      // partnership row the DB happens to return first. Deliberately lists
      // partnerA (the EX-wife, isCurrent: false) BEFORE partnerB (the
      // CURRENT wife, isCurrent: true) in partnershipEdges — a naive
      // "first edge wins" primary-partner pick would put the ex-wife right
      // beside root and shove the current wife out to the further
      // extra-partner slot, exactly backwards from what the domain
      // requires.
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("exWife", { gender: "female" }),
          person("currentWife", { gender: "female" }),
        ],
        parentChildEdges: [],
        partnershipEdges: [
          { person1Id: "root", person2Id: "exWife", isCurrent: false },
          { person1Id: "root", person2Id: "currentWife", isCurrent: true },
        ],
        focusPersonId: "root",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const rootX = byId.get("root")!.x;
      const currentWifeX = byId.get("currentWife")!.x;
      const exWifeX = byId.get("exWife")!.x;

      // currentWife sits in the tight couple-adjacency slot (exactly
      // PARTNER_X_SPACING = 260 from root); exWife is further out.
      expect(Math.abs(currentWifeX - rootX)).toBe(260);
      expect(Math.abs(exWifeX - rootX)).toBeGreaterThan(260);
    });

    it("keeps every partner (and their own ancestor fan) collision-free", () => {
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("partnerAMother"),
          person("partnerAFather"),
          person("partnerB", { gender: "female" }),
          person("partnerBMother"),
          person("partnerBFather"),
        ],
        parentChildEdges: [
          { parentId: "partnerAMother", childId: "partnerA" },
          { parentId: "partnerAFather", childId: "partnerA" },
          { parentId: "partnerBMother", childId: "partnerB" },
          { parentId: "partnerBFather", childId: "partnerB" },
        ],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: false },
          { person1Id: "root", person2Id: "partnerB", isCurrent: true },
          {
            person1Id: "partnerAMother",
            person2Id: "partnerAFather",
            isCurrent: true,
          },
          {
            person1Id: "partnerBMother",
            person2Id: "partnerBFather",
            isCurrent: true,
          },
        ],
        focusPersonId: "root",
        ancestorGenerations: Infinity,
        descendantGenerations: Infinity,
      });

      const xByGeneration = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration.has(node.generation))
          xByGeneration.set(node.generation, []);
        xByGeneration.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const rootX = byId.get("root")!.x;
      const partnerAX = byId.get("partnerA")!.x;
      const partnerBX = byId.get("partnerB")!.x;
      expect(Math.abs(rootX - partnerAX)).toBeGreaterThanOrEqual(220);
      expect(Math.abs(rootX - partnerBX)).toBeGreaterThanOrEqual(220);
      expect(Math.abs(partnerAX - partnerBX)).toBeGreaterThanOrEqual(220);
    });

    it("still groups a child with no second recorded parent under the primary partner's row", () => {
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("soloChild"), // recorded with root only — no second parent
        ],
        parentChildEdges: [{ parentId: "root", childId: "soloChild" }],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: true },
        ],
        focusPersonId: "root",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      expect(byId.has("soloChild")).toBe(true);
      const rootX = byId.get("root")!.x;
      const partnerAX = byId.get("partnerA")!.x;
      const soloChildX = byId.get("soloChild")!.x;
      expect(soloChildX).toBeCloseTo((rootX + partnerAX) / 2);
    });

    it("lays out 3 partnerships deterministically, in partnershipEdges order", () => {
      const input = {
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("partnerB", { gender: "female" }),
          person("partnerC", { gender: "female" }),
        ],
        parentChildEdges: [],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: false },
          { person1Id: "root", person2Id: "partnerB", isCurrent: false },
          { person1Id: "root", person2Id: "partnerC", isCurrent: true },
        ],
        focusPersonId: "root",
      };

      const result1 = buildFocusTreeLayout(input);
      const result2 = buildFocusTreeLayout(input);
      expect(result1).toEqual(result2);

      const byId = new Map(result1.nodes.map((n) => [n.id, n]));
      // All partner x positions are distinct and collision-free.
      const xs = [
        byId.get("partnerA")!.x,
        byId.get("partnerB")!.x,
        byId.get("partnerC")!.x,
      ];
      expect(new Set(xs).size).toBe(3);
    });

    it("doesn't duplicate a partner also reachable via another path in the visible tree", () => {
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("partnerB", { gender: "female" }),
          person("sharedGrandparent"),
        ],
        parentChildEdges: [
          { parentId: "sharedGrandparent", childId: "partnerB" },
          { parentId: "sharedGrandparent", childId: "rootParent" },
          { parentId: "rootParent", childId: "root" },
        ],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: false },
          { person1Id: "root", person2Id: "partnerB", isCurrent: true },
        ],
        focusPersonId: "root",
        ancestorGenerations: Infinity,
        descendantGenerations: Infinity,
      });

      const ids = result.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("keeps half-siblings from different partners in separate rows, not merged into one sibling group", () => {
      const result = buildFocusTreeLayout({
        persons: [
          person("root", { gender: "male" }),
          person("partnerA", { gender: "female" }),
          person("partnerB", { gender: "female" }),
          person("childOfA"),
          person("childOfB"),
        ],
        parentChildEdges: [
          { parentId: "root", childId: "childOfA" },
          { parentId: "partnerA", childId: "childOfA" },
          { parentId: "root", childId: "childOfB" },
          { parentId: "partnerB", childId: "childOfB" },
        ],
        partnershipEdges: [
          { person1Id: "root", person2Id: "partnerA", isCurrent: false },
          { person1Id: "root", person2Id: "partnerB", isCurrent: true },
        ],
        focusPersonId: "root",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      // Both half-siblings are present, at the same generation, but NOT at
      // the same x (they ride under their own parent's couple, not stacked
      // together as a plain sibling row).
      expect(byId.get("childOfA")?.generation).toBe(
        byId.get("childOfB")?.generation,
      );
      expect(byId.get("childOfA")!.x).not.toBe(byId.get("childOfB")!.x);
    });
  });

  describe("a partner's own sibling with children", () => {
    it("keeps a person's own children centered under their couple, even when the partner's sibling's kids share the same generation", () => {
      // Reproduces a real production bug: Виктор's sister Светлана is
      // herself partnered (Виктор Ефимович) with two kids (Юрий, Ольга) —
      // ordinary cousins of Виктор+Галина's own children, but landing at
      // the SAME generation purely by coincidence of tree depth. Their
      // subtree used to get merged into the shared collision extent BEFORE
      // Виктор+Галина's own children were placed, shoving those children
      // (Александр, Дарья) far sideways to "avoid" cousins they have no
      // actual positional relationship to.
      const result = buildFocusTreeLayout({
        persons: [
          person("nikolaySr", { gender: "male" }),
          person("elizaveta", { gender: "female" }),
          person("viktor", { gender: "male" }),
          person("svetlana", { gender: "female" }),
          person("viktorEfimovich", { gender: "male" }),
          person("yuri"),
          person("olga"),
          person("galina", { gender: "female" }),
          person("alexander", { gender: "male" }),
          person("darya", { gender: "female" }),
        ],
        parentChildEdges: [
          { parentId: "nikolaySr", childId: "viktor" },
          { parentId: "elizaveta", childId: "viktor" },
          { parentId: "nikolaySr", childId: "svetlana" },
          { parentId: "elizaveta", childId: "svetlana" },
          { parentId: "svetlana", childId: "yuri" },
          { parentId: "viktorEfimovich", childId: "yuri" },
          { parentId: "svetlana", childId: "olga" },
          { parentId: "viktorEfimovich", childId: "olga" },
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "viktor", childId: "darya" },
          { parentId: "galina", childId: "darya" },
        ],
        partnershipEdges: [
          { person1Id: "nikolaySr", person2Id: "elizaveta", isCurrent: true },
          {
            person1Id: "svetlana",
            person2Id: "viktorEfimovich",
            isCurrent: true,
          },
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
        ],
        focusPersonId: "galina",
        ancestorGenerations: Infinity,
        descendantGenerations: Infinity,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const galinaX = byId.get("galina")!.x;
      const viktorX = byId.get("viktor")!.x;
      const alexanderX = byId.get("alexander")!.x;
      const coupleCenter = (galinaX + viktorX) / 2;

      // Alexander (Виктор+Галина's own child) is centered under HIS OWN
      // parents' couple, not shoved off toward his cousins Юрий/Ольга.
      // 280 == UNIT_X_SPACING (the seam between unrelated units) — well
      // under the ~800+ offset the bug used to produce.
      expect(Math.abs(alexanderX - coupleCenter)).toBeLessThan(280);

      // No x-collisions at any generation, including generation 1 where
      // Alexander/Darya (Виктор's own kids) and Yuri/Olga (his sister's
      // kids) both land.
      const xByGeneration = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration.has(node.generation))
          xByGeneration.set(node.generation, []);
        xByGeneration.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });
  });

  describe("core/lateral split via layoutCoupleFan (focus is a grandchild)", () => {
    it("keeps a grandchild's own parents centered near them, even when one parent's OWN sibling married into a large family", () => {
      // Reproduces a real production bug: focus = Эва (great-granddaughter).
      // Her parents (Александр + Элеонора) are reached through
      // layoutCoupleFan, which itself contains Александр's sibling Дарья —
      // fine on its own — AND Александр's own parents Виктор+Галина, whose
      // OWN wide sibling group (Galina has many siblings, each with a
      // family) used to inflate the whole combined layoutCoupleFan piece
      // enough to drag Александр+Элеонора thousands of pixels from Эва.
      const result = buildFocusTreeLayout({
        persons: [
          person("nikolaySr", { gender: "male" }),
          person("elizaveta", { gender: "female" }),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          ...Array.from({ length: 6 }, (_, i) =>
            person(`galinaSib${i}`, {
              gender: i % 2 === 0 ? "female" : "male",
            }),
          ),
          ...Array.from({ length: 6 }, (_, i) =>
            person(`galinaSibPartner${i}`, {
              gender: i % 2 === 0 ? "male" : "female",
            }),
          ),
          person("alexander", { gender: "male" }),
          person("darya"),
          person("eleonora", { gender: "female" }),
          person("eva"),
        ],
        parentChildEdges: [
          { parentId: "nikolaySr", childId: "viktor" },
          { parentId: "elizaveta", childId: "viktor" },
          ...Array.from({ length: 6 }, (_, i) => ({
            parentId: "nikolaySr",
            childId: `galinaSib${i}`,
          })),
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "viktor", childId: "darya" },
          { parentId: "galina", childId: "darya" },
          { parentId: "alexander", childId: "eva" },
          { parentId: "eleonora", childId: "eva" },
        ],
        partnershipEdges: [
          { person1Id: "nikolaySr", person2Id: "elizaveta", isCurrent: true },
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          { person1Id: "alexander", person2Id: "eleonora", isCurrent: true },
          ...Array.from({ length: 6 }, (_, i) => ({
            person1Id: `galinaSib${i}`,
            person2Id: `galinaSibPartner${i}`,
            isCurrent: true,
          })),
        ],
        focusPersonId: "eva",
        ancestorGenerations: Infinity,
        descendantGenerations: Infinity,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const alexanderX = byId.get("alexander")!.x;
      const viktorX = byId.get("viktor")!.x;
      const galinaX = byId.get("galina")!.x;

      // Alexander (Eva's own father) stays close to HIS OWN parents
      // Виктор+Галина, not dragged off by Галина's own sibling group.
      const coupleCenter = (viktorX + galinaX) / 2;
      expect(Math.abs(alexanderX - coupleCenter)).toBeLessThan(600);

      // No x-collisions at any generation.
      const xByGeneration = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration.has(node.generation))
          xByGeneration.set(node.generation, []);
        xByGeneration.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps an unpartnered sibling near their own parents' couple, even when a DIFFERENT sibling has a large in-law family", () => {
      // Reproduces a real production bug: Дарья (unpartnered) used to be
      // dragged 9000+ px away because layoutChildrenRow flattened ALL
      // children into one push, and a sibling's own large in-law family
      // (via a DIFFERENT child, e.g. grandparent-level siblings) inflated
      // that single push. This constructs a shape where Дарья's own
      // generation contains a wide, unrelated lateral group from a
      // grandparent's own siblings.
      const result = buildFocusTreeLayout({
        persons: [
          person("nikolaySr", { gender: "male" }),
          person("elizaveta", { gender: "female" }),
          ...Array.from({ length: 5 }, (_, i) =>
            person(`sib${i}`, { gender: i % 2 === 0 ? "female" : "male" }),
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            person(`sibPartner${i}`, {
              gender: i % 2 === 0 ? "male" : "female",
            }),
          ),
          ...Array.from({ length: 5 }, (_, i) => person(`sibChild${i}`)),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("alexander", { gender: "male" }),
          person("darya"),
        ],
        parentChildEdges: [
          { parentId: "nikolaySr", childId: "viktor" },
          { parentId: "elizaveta", childId: "viktor" },
          ...Array.from({ length: 5 }, (_, i) => ({
            parentId: "nikolaySr",
            childId: `sib${i}`,
          })),
          ...Array.from({ length: 5 }, (_, i) => ({
            parentId: `sib${i}`,
            childId: `sibChild${i}`,
          })),
          ...Array.from({ length: 5 }, (_, i) => ({
            parentId: `sibPartner${i}`,
            childId: `sibChild${i}`,
          })),
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "viktor", childId: "darya" },
          { parentId: "galina", childId: "darya" },
        ],
        partnershipEdges: [
          { person1Id: "nikolaySr", person2Id: "elizaveta", isCurrent: true },
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          ...Array.from({ length: 5 }, (_, i) => ({
            person1Id: `sib${i}`,
            person2Id: `sibPartner${i}`,
            isCurrent: true,
          })),
        ],
        focusPersonId: "alexander",
        ancestorGenerations: Infinity,
        descendantGenerations: Infinity,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const alexanderX = byId.get("alexander")!.x;
      const daryaX = byId.get("darya")!.x;

      // Darya (Alexander's own sibling, unpartnered) stays close to
      // Alexander — not dragged off by unrelated great-uncles/aunts.
      expect(Math.abs(daryaX - alexanderX)).toBeLessThan(600);

      const xByGeneration = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration.has(node.generation))
          xByGeneration.set(node.generation, []);
        xByGeneration.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps each of two non-partnered recorded parents' own remarriages on their own side, without crossing", () => {
      // Reproduces a real bug: focus's two recorded parents (dad/mom) were
      // never partnered with each other (divorced/never married), and each
      // separately remarried. layoutCoupleFan's "not partners" branch used
      // to call layoutUnit(dad, "left", ctx) and layoutUnit(mom, "right",
      // ctx) WITHOUT forcePartnerSide — each call's own gender-based
      // husband-left/wife-right rule then placed dad's new (female) wife on
      // HIS local right (toward mom's side) and mom's new (male) husband on
      // HER local left (toward dad's side), crossing the two family lines:
      // dad / momNewHusband / dadNewWife / mom instead of staying strictly
      // split, dad's whole line on the left and mom's whole line on the
      // right of the fan's own center.
      const result = buildFocusTreeLayout({
        persons: [
          person("me"),
          person("dad", { gender: "male" }),
          person("mom", { gender: "female" }),
          person("dadNewWife", { gender: "female" }),
          person("momNewHusband", { gender: "male" }),
        ],
        parentChildEdges: [
          { parentId: "dad", childId: "me" },
          { parentId: "mom", childId: "me" },
        ],
        partnershipEdges: [
          { person1Id: "dad", person2Id: "dadNewWife", isCurrent: true },
          { person1Id: "mom", person2Id: "momNewHusband", isCurrent: true },
        ],
        focusPersonId: "me",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const dadX = byId.get("dad")!.x;
      const momX = byId.get("mom")!.x;
      const dadNewWifeX = byId.get("dadNewWife")!.x;
      const momNewHusbandX = byId.get("momNewHusband")!.x;

      // dad and his own new wife stay together, strictly on the opposite
      // side of the fan's center from mom and her own new husband — no
      // crossing (dadNewWife must not land closer to mom than to dad, and
      // momNewHusband must not land closer to dad than to mom).
      expect(dadX).toBeLessThan(0);
      expect(momX).toBeGreaterThan(0);
      expect(Math.abs(dadNewWifeX - dadX)).toBeLessThan(
        Math.abs(dadNewWifeX - momX),
      );
      expect(Math.abs(momNewHusbandX - momX)).toBeLessThan(
        Math.abs(momNewHusbandX - dadX),
      );
      expect(dadNewWifeX).toBeLessThan(momNewHusbandX);
    });

    it("keeps BOTH spouses' own parent fans centered on their own person when both fans would otherwise collide", () => {
      // Reproduces a real production bug: focus = Виктор, married to
      // Галина. BOTH of them have their own visible parents, so the two
      // ancestor fans meet in the middle with zero natural gap. The old
      // behavior pushed Виктор's own parent fan alone by the FULL
      // separating amount (rootId's fan is placed AFTER the primary
      // partner's, so it alone absorbed the whole push) — Виктор's own
      // parents ended up centered a full PARTNER_X_SPACING away from him,
      // near where his SISTER stood instead of directly above him. The fix
      // splits the push: half widens the gap between Виктор and Галина
      // (free to grow — nothing pins an EXACT distance between them, only
      // a minimum), half is still absorbed by Виктор's own fan — so both
      // fans land close to their own person.
      const result = buildFocusTreeLayout({
        persons: [
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("nikolayK", { gender: "male" }),
          person("elizavetaK", { gender: "female" }),
          person("nikolayKozl", { gender: "male" }),
          person("nadezhdaKozl", { gender: "female" }),
        ],
        parentChildEdges: [
          { parentId: "nikolayK", childId: "viktor" },
          { parentId: "elizavetaK", childId: "viktor" },
          { parentId: "nikolayKozl", childId: "galina" },
          { parentId: "nadezhdaKozl", childId: "galina" },
        ],
        partnershipEdges: [
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          { person1Id: "nikolayK", person2Id: "elizavetaK", isCurrent: true },
          {
            person1Id: "nikolayKozl",
            person2Id: "nadezhdaKozl",
            isCurrent: true,
          },
        ],
        focusPersonId: "viktor",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const viktorX = byId.get("viktor")!.x;
      const galinaX = byId.get("galina")!.x;
      const nikolayKX = byId.get("nikolayK")!.x;
      const elizavetaKX = byId.get("elizavetaK")!.x;
      const nikolayKozlX = byId.get("nikolayKozl")!.x;
      const nadezhdaKozlX = byId.get("nadezhdaKozl")!.x;

      // Виктор never moves (layoutUnit's own invariant: rootId always sits
      // at relativeX 0 within its own frame — the top-level couple here has
      // Виктор as focus, so his x stays exactly where buildFocusTreeLayout
      // put him).
      expect(viktorX).toBe(0);
      // Both fans stay on their own correct side, no crossing.
      expect(Math.max(nikolayKX, elizavetaKX)).toBeLessThan(
        Math.min(nikolayKozlX, nadezhdaKozlX),
      );

      // The actual regression: Виктор's own parents must stay CLOSE to
      // Виктор, not drift off toward Галина's side by a full
      // PARTNER_X_SPACING or more.
      const viktorParentsCenter = (nikolayKX + elizavetaKX) / 2;
      expect(Math.abs(viktorParentsCenter - viktorX)).toBeLessThan(200);
      // Галина's own parents stay exactly centered on her (unaffected by
      // the split — she's the primary partner, placed first).
      const galinaParentsCenter = (nikolayKozlX + nadezhdaKozlX) / 2;
      expect(galinaParentsCenter).toBe(galinaX);

      // No x-collisions at any generation.
      const xByGeneration = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration.has(node.generation))
          xByGeneration.set(node.generation, []);
        xByGeneration.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps a spouse's own sibling on ITS natural side, not dragged past the other spouse's siblings", () => {
      // Reproduces a real production bug: focus = Александр, whose parents
      // Виктор+Галина are reached through layoutCoupleFan (a single nested
      // layoutUnit(Виктор, ...) call folds the whole couple in as ONE
      // piece, generation -1). Виктор has his OWN sibling; Галина has
      // several siblings of her own. parentFan.lateralGroups mixes BOTH
      // spouses' own sibling groups into one array — Виктор's own sibling
      // naturally sits on Виктор's side (left of the couple's own
      // midpoint), Галина's siblings naturally sit on Галина's side
      // (right). placePiece's lateral-group loop used to push EVERY group
      // using the single outer `direction` (the direction the WHOLE
      // parentFan piece itself was pushed on collision) — for a couple's
      // combined fan, that direction is arbitrary relative to each
      // individual sibling group's own natural side. Виктор's own sibling,
      // naturally far to the left, got treated as "approaching from the
      // right" and shoved thousands of pixels past ALL of Галина's own
      // siblings instead of staying near Виктор.
      const result = buildFocusTreeLayout({
        persons: [
          person("alexander", { gender: "male" }),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("nikolayK", { gender: "male" }),
          person("elizavetaK", { gender: "female" }),
          person("viktorSib", { gender: "female" }),
          person("nikolayKozl", { gender: "male" }),
          person("nadezhdaKozl", { gender: "female" }),
          ...Array.from({ length: 3 }, (_, i) =>
            person(`galinaSib${i}`, {
              gender: i % 2 === 0 ? "female" : "male",
            }),
          ),
        ],
        parentChildEdges: [
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "nikolayK", childId: "viktor" },
          { parentId: "elizavetaK", childId: "viktor" },
          { parentId: "nikolayK", childId: "viktorSib" },
          { parentId: "elizavetaK", childId: "viktorSib" },
          { parentId: "nikolayKozl", childId: "galina" },
          { parentId: "nadezhdaKozl", childId: "galina" },
          ...Array.from({ length: 3 }, (_, i) => ({
            parentId: "nikolayKozl",
            childId: `galinaSib${i}`,
          })),
        ],
        partnershipEdges: [
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          { person1Id: "nikolayK", person2Id: "elizavetaK", isCurrent: true },
          {
            person1Id: "nikolayKozl",
            person2Id: "nadezhdaKozl",
            isCurrent: true,
          },
        ],
        focusPersonId: "alexander",
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const viktorX = byId.get("viktor")!.x;
      const galinaX = byId.get("galina")!.x;
      const viktorSibX = byId.get("viktorSib")!.x;
      const galinaSib0X = byId.get("galinaSib0")!.x;

      // Виктор's own sibling stays on Виктор's side — never crossing past
      // Виктор himself, and never landing among/past Галина's siblings.
      expect(viktorSibX).toBeLessThan(viktorX);
      expect(viktorSibX).toBeLessThan(galinaSib0X);
      // Галина's siblings stay on Галина's side.
      expect(galinaSib0X).toBeGreaterThan(galinaX);

      // No x-collisions at any generation.
      const xByGeneration2 = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration2.has(node.generation))
          xByGeneration2.set(node.generation, []);
        xByGeneration2.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration2) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps a spouse's own sibling's CHILDREN right next to that sibling, not thousands of px away", () => {
      // Reproduces a real production bug: focus = Александр, Виктор's own
      // sibling (Светлана) is herself partnered with children (Юрий,
      // Ольга) — an ordinary uncle/aunt's own kids. Виктор's sibling group
      // was correctly stamped with its own `direction` by the previous fix
      // (see the test above), but the group's OWN nested children rode
      // along inside that SAME group's slots — and `placePiece`'s lateral-
      // group loop only reads `group.direction` once per group, applying
      // it uniformly to every slot in that group (Светлана AND her kids
      // alike), so this part already worked... UNLESS a naive fix instead
      // re-derived direction per-group from that group's own center sign
      // (an earlier, reverted attempt at this fix) — a children pair
      // straddling zero (e.g. one child left, one right of their own
      // parent) has an arbitrary-sign center, breaking exactly this case.
      // This test locks in the correct behavior: a sibling's own children
      // always land close to that sibling, regardless of their own
      // individual left/right straddle.
      const result = buildFocusTreeLayout({
        persons: [
          person("alexander", { gender: "male" }),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("nikolayK", { gender: "male" }),
          person("elizavetaK", { gender: "female" }),
          person("svetlana", { gender: "female" }),
          person("viktorE", { gender: "male" }),
          person("yuri", { gender: "male" }),
          person("olga", { gender: "female" }),
          person("nikolayKozl", { gender: "male" }),
          person("nadezhdaKozl", { gender: "female" }),
          ...Array.from({ length: 6 }, (_, i) =>
            person(`galinaSib${i}`, {
              gender: i % 2 === 0 ? "female" : "male",
            }),
          ),
        ],
        parentChildEdges: [
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "nikolayK", childId: "viktor" },
          { parentId: "elizavetaK", childId: "viktor" },
          { parentId: "nikolayK", childId: "svetlana" },
          { parentId: "elizavetaK", childId: "svetlana" },
          { parentId: "svetlana", childId: "yuri" },
          { parentId: "viktorE", childId: "yuri" },
          { parentId: "svetlana", childId: "olga" },
          { parentId: "viktorE", childId: "olga" },
          { parentId: "nikolayKozl", childId: "galina" },
          { parentId: "nadezhdaKozl", childId: "galina" },
          ...Array.from({ length: 6 }, (_, i) => ({
            parentId: "nikolayKozl",
            childId: `galinaSib${i}`,
          })),
        ],
        partnershipEdges: [
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          { person1Id: "nikolayK", person2Id: "elizavetaK", isCurrent: true },
          { person1Id: "svetlana", person2Id: "viktorE", isCurrent: true },
          {
            person1Id: "nikolayKozl",
            person2Id: "nadezhdaKozl",
            isCurrent: true,
          },
        ],
        focusPersonId: "alexander",
        descendantGenerations: 1,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const svetlanaX = byId.get("svetlana")!.x;
      const viktorEX = byId.get("viktorE")!.x;
      const yuriX = byId.get("yuri")!.x;
      const olgaX = byId.get("olga")!.x;

      // Юрий/Ольга stay close to their own parents (Светлана+Виктор Е.) —
      // not dragged thousands of px away toward Галина's own huge sibling
      // group.
      expect(Math.abs(yuriX - svetlanaX)).toBeLessThan(600);
      expect(Math.abs(olgaX - svetlanaX)).toBeLessThan(600);
      expect(Math.abs(yuriX - viktorEX)).toBeLessThan(600);
      expect(Math.abs(olgaX - viktorEX)).toBeLessThan(600);

      // No x-collisions at any generation.
      const xByGeneration3 = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration3.has(node.generation))
          xByGeneration3.set(node.generation, []);
        xByGeneration3.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration3) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps a grandparent's own siblings on their own family's side, not split across into the other spouse's line", () => {
      // Reproduces a real production bug: focus = Александр. Виктор's own
      // ancestor line (Купчик) must stay entirely on Виктор's side; Галина's
      // own ancestor line (her parents Николай Козловский + Надежда
      // Козловская, AND Николай's own siblings — an uncle/aunt one
      // generation further up) must stay entirely on Галина's side. The
      // previous fix (stamping a direction on a couple's own combined
      // lateral riders) was applied at EVERY nested layoutCoupleFan call,
      // not just the outermost — so Николай Козловский's own siblings,
      // stamped correctly relative to THEIR OWN local fan one level down,
      // got RE-interpreted (and corrupted) against the outer Виктор+Галина
      // fan's own different axis, splitting one sibling off across onto
      // Виктор's side while the rest of his own siblings stayed with
      // Галина. This test locks in that a nested ancestor generation's own
      // sibling group never crosses into the OTHER spouse's line.
      const result = buildFocusTreeLayout({
        persons: [
          person("alexander", { gender: "male" }),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("nikolayK", { gender: "male" }),
          person("elizavetaK", { gender: "female" }),
          person("nikolayKozl", { gender: "male" }),
          person("nadezhdaKozl", { gender: "female" }),
          person("vasily", { gender: "male" }),
          person("elizavetaKozl", { gender: "female" }),
          person("yuzik", { gender: "male" }),
          person("daniil", { gender: "male" }),
          person("alexeyKozl", { gender: "male" }),
          person("grigoryK", { gender: "male" }),
          person("agrafena", { gender: "female" }),
        ],
        parentChildEdges: [
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "nikolayK", childId: "viktor" },
          { parentId: "elizavetaK", childId: "viktor" },
          { parentId: "nikolayKozl", childId: "galina" },
          { parentId: "nadezhdaKozl", childId: "galina" },
          { parentId: "vasily", childId: "nikolayKozl" },
          { parentId: "elizavetaKozl", childId: "nikolayKozl" },
          { parentId: "vasily", childId: "yuzik" },
          { parentId: "elizavetaKozl", childId: "yuzik" },
          { parentId: "vasily", childId: "daniil" },
          { parentId: "elizavetaKozl", childId: "daniil" },
          { parentId: "vasily", childId: "alexeyKozl" },
          { parentId: "elizavetaKozl", childId: "alexeyKozl" },
          { parentId: "grigoryK", childId: "nadezhdaKozl" },
          { parentId: "agrafena", childId: "nadezhdaKozl" },
        ],
        partnershipEdges: [
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          { person1Id: "nikolayK", person2Id: "elizavetaK", isCurrent: true },
          {
            person1Id: "nikolayKozl",
            person2Id: "nadezhdaKozl",
            isCurrent: true,
          },
          { person1Id: "vasily", person2Id: "elizavetaKozl", isCurrent: true },
          { person1Id: "grigoryK", person2Id: "agrafena", isCurrent: true },
        ],
        focusPersonId: "alexander",
        ancestorGenerations: Infinity,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const viktorX = byId.get("viktor")!.x;
      const galinaX = byId.get("galina")!.x;
      const nikolayKX = byId.get("nikolayK")!.x;
      const elizavetaKX = byId.get("elizavetaK")!.x;
      const nikolayKozlX = byId.get("nikolayKozl")!.x;
      const yuzikX = byId.get("yuzik")!.x;
      const daniilX = byId.get("daniil")!.x;
      const alexeyKozlX = byId.get("alexeyKozl")!.x;

      // Виктор's own line (his parents) stays entirely left of Галина's
      // own line (her parents + her father's own siblings) — no crossing.
      expect(Math.max(nikolayKX, elizavetaKX)).toBeLessThan(nikolayKozlX);
      // Николай Козловский's own siblings stay together on Галина's side —
      // NONE of them cross back to Виктор's side.
      for (const sibX of [yuzikX, daniilX, alexeyKozlX]) {
        expect(sibX).toBeGreaterThan(Math.max(nikolayKX, elizavetaKX));
      }
      expect(viktorX).toBeLessThan(galinaX);

      // No x-collisions at any generation.
      const xByGeneration4 = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration4.has(node.generation))
          xByGeneration4.set(node.generation, []);
        xByGeneration4.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration4) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps a couple's own two sibling-fans as separate contiguous blocks, not interleaved", () => {
      // Reproduces a real production bug: focus = Александр, ancestor
      // couple Николай Козловский + Надежда Козловская (Галина's parents).
      // Николай's own siblings (Юзик/Даниил/Алексей Козловский, via HIS
      // parents Василий+Елизавета) and Надежда's own siblings (Николай/
      // Алексей/Павел/Григорий Колесникович, via HER parents Григорий
      // (Юрий)+Аграфена Колесникович) both land at the same generation.
      // Before this fix, both groups fell back to the single outer
      // `direction` used to place the whole Николай+Надежда parentFan
      // piece, collapsing what should be two separate family blocks (each
      // flanking its own couple) into one flat, interleaved-looking row —
      // reported as "Николай Колесникович, Купчик, Ушкар — одна линия,
      // Козловский, Колесникович — другая" appearing merged in one line.
      const result = buildFocusTreeLayout({
        persons: [
          person("alexander", { gender: "male" }),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("nikolayKozl", { gender: "male" }),
          person("nadezhdaKozl", { gender: "female" }),
          person("vasily", { gender: "male" }),
          person("elizavetaKozl", { gender: "female" }),
          person("grigoryK", { gender: "male" }),
          person("agrafena", { gender: "female" }),
          person("yuzik", { gender: "male" }),
          person("daniil", { gender: "male" }),
          person("alexeyKozl", { gender: "male" }),
          person("nikolayKol", { gender: "male" }),
          person("alexeyKol", { gender: "male" }),
          person("pavelKol", { gender: "male" }),
          person("grigoryKol", { gender: "male" }),
        ],
        parentChildEdges: [
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "nikolayKozl", childId: "galina" },
          { parentId: "nadezhdaKozl", childId: "galina" },
          { parentId: "vasily", childId: "nikolayKozl" },
          { parentId: "elizavetaKozl", childId: "nikolayKozl" },
          { parentId: "vasily", childId: "yuzik" },
          { parentId: "elizavetaKozl", childId: "yuzik" },
          { parentId: "vasily", childId: "daniil" },
          { parentId: "elizavetaKozl", childId: "daniil" },
          { parentId: "vasily", childId: "alexeyKozl" },
          { parentId: "elizavetaKozl", childId: "alexeyKozl" },
          { parentId: "grigoryK", childId: "nadezhdaKozl" },
          { parentId: "agrafena", childId: "nadezhdaKozl" },
          { parentId: "grigoryK", childId: "nikolayKol" },
          { parentId: "agrafena", childId: "nikolayKol" },
          { parentId: "grigoryK", childId: "alexeyKol" },
          { parentId: "agrafena", childId: "alexeyKol" },
          { parentId: "grigoryK", childId: "pavelKol" },
          { parentId: "agrafena", childId: "pavelKol" },
          { parentId: "grigoryK", childId: "grigoryKol" },
          { parentId: "agrafena", childId: "grigoryKol" },
        ],
        partnershipEdges: [
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          {
            person1Id: "nikolayKozl",
            person2Id: "nadezhdaKozl",
            isCurrent: true,
          },
          { person1Id: "vasily", person2Id: "elizavetaKozl", isCurrent: true },
          { person1Id: "grigoryK", person2Id: "agrafena", isCurrent: true },
        ],
        focusPersonId: "alexander",
        ancestorGenerations: Infinity,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const nikolayKozlX = byId.get("nikolayKozl")!.x;
      const nadezhdaKozlX = byId.get("nadezhdaKozl")!.x;
      const kozlSibXs = ["yuzik", "daniil", "alexeyKozl"].map(
        (id) => byId.get(id)!.x,
      );
      const kolSibXs = [
        "nikolayKol",
        "alexeyKol",
        "pavelKol",
        "grigoryKol",
      ].map((id) => byId.get(id)!.x);

      // Николай+Надежда stay adjacent as a couple, both sibling groups sit
      // beyond them (never between/before the couple itself).
      expect(Math.abs(nikolayKozlX - nadezhdaKozlX)).toBeLessThan(400);
      const coupleMax = Math.max(nikolayKozlX, nadezhdaKozlX);
      for (const x of [...kozlSibXs, ...kolSibXs])
        expect(x).toBeGreaterThan(coupleMax);

      // Each sibling group forms its OWN contiguous block — none of
      // Николай's own siblings is interleaved between any of Надежда's,
      // or vice versa (the exact reported "merged into one line" bug).
      const kozlMax = Math.max(...kozlSibXs);
      const kozlMin = Math.min(...kozlSibXs);
      const kolMax = Math.max(...kolSibXs);
      const kolMin = Math.min(...kolSibXs);
      const rangesOverlap = kozlMin <= kolMax && kolMin <= kozlMax;
      expect(rangesOverlap).toBe(false);

      // No x-collisions at any generation.
      const xByGeneration6 = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration6.has(node.generation))
          xByGeneration6.set(node.generation, []);
        xByGeneration6.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration6) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });

    it("keeps a great-aunt on her own great-grandparents' side across TWO nested couple fans", () => {
      // Reproduces a real production bug one level deeper than the previous
      // test: focus = Александр. Виктор's own MOTHER (Елизавета) has a
      // sister (Елена) — an ordinary great-aunt, reached through TWO
      // nested layoutCoupleFan calls: the outer one for Виктор+Галина
      // (splits by spouse — correct, needed), and an INNER one, entirely
      // within Виктор's own nested layoutUnit call, for Виктор's OWN
      // parents (Николай Купчик + Елизавета). That inner call used to
      // ALSO split its own parentFan's lateral riders by spouse (isTopLevel
      // was always true for every layoutUnit's own parentFan) — stamping
      // Елена's group with a direction relative to Виктор's own parents'
      // local axis. But Виктор's own layoutUnit result is itself STILL
      // going to be folded into the OUTER Виктор+Галина fan afterward —
      // that stamped direction got reinterpreted against the outer axis
      // and corrupted, shoving Елена thousands of px onto Галина's side
      // (the exact reported bug: Елена Ушкар ended up past Козловский/
      // Колесникович instead of beside Виктор's own parents).
      const result = buildFocusTreeLayout({
        persons: [
          person("alexander", { gender: "male" }),
          person("viktor", { gender: "male" }),
          person("galina", { gender: "female" }),
          person("nikolayK", { gender: "male" }),
          person("elizavetaK", { gender: "female" }),
          person("grigoryKrivusha", { gender: "male" }),
          person("elizavetaKrivusha", { gender: "female" }),
          person("elenaUshkar", { gender: "female" }),
          person("nikolayKozl", { gender: "male" }),
          person("nadezhdaKozl", { gender: "female" }),
          ...Array.from({ length: 4 }, (_, i) =>
            person(`galinaSib${i}`, {
              gender: i % 2 === 0 ? "female" : "male",
            }),
          ),
        ],
        parentChildEdges: [
          { parentId: "viktor", childId: "alexander" },
          { parentId: "galina", childId: "alexander" },
          { parentId: "nikolayK", childId: "viktor" },
          { parentId: "elizavetaK", childId: "viktor" },
          { parentId: "grigoryKrivusha", childId: "elizavetaK" },
          { parentId: "elizavetaKrivusha", childId: "elizavetaK" },
          { parentId: "grigoryKrivusha", childId: "elenaUshkar" },
          { parentId: "elizavetaKrivusha", childId: "elenaUshkar" },
          { parentId: "nikolayKozl", childId: "galina" },
          { parentId: "nadezhdaKozl", childId: "galina" },
          ...Array.from({ length: 4 }, (_, i) => ({
            parentId: "nikolayKozl",
            childId: `galinaSib${i}`,
          })),
        ],
        partnershipEdges: [
          { person1Id: "viktor", person2Id: "galina", isCurrent: true },
          { person1Id: "nikolayK", person2Id: "elizavetaK", isCurrent: true },
          {
            person1Id: "grigoryKrivusha",
            person2Id: "elizavetaKrivusha",
            isCurrent: true,
          },
          {
            person1Id: "nikolayKozl",
            person2Id: "nadezhdaKozl",
            isCurrent: true,
          },
        ],
        focusPersonId: "alexander",
        ancestorGenerations: Infinity,
      });

      const byId = new Map(result.nodes.map((n) => [n.id, n]));
      const viktorX = byId.get("viktor")!.x;
      const galinaX = byId.get("galina")!.x;
      const elizavetaKX = byId.get("elizavetaK")!.x;
      const elenaUshkarX = byId.get("elenaUshkar")!.x;
      const nikolayKozlX = byId.get("nikolayKozl")!.x;

      // Елена (Виктор's own aunt) stays on Виктор's side — left of Виктор
      // and Галина both, never crossing to Галина's side.
      expect(viktorX).toBeLessThan(galinaX);
      expect(elenaUshkarX).toBeLessThan(nikolayKozlX);
      expect(Math.abs(elenaUshkarX - elizavetaKX)).toBeLessThan(600);

      // No x-collisions at any generation.
      const xByGeneration5 = new Map<number, number[]>();
      for (const node of result.nodes) {
        if (!xByGeneration5.has(node.generation))
          xByGeneration5.set(node.generation, []);
        xByGeneration5.get(node.generation)!.push(node.x);
      }
      for (const [, xValues] of xByGeneration5) {
        expect(new Set(xValues).size).toBe(xValues.length);
      }
    });
  });
});
