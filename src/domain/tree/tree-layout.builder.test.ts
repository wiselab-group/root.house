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
    expect(result.nodes.find((n) => n.id === "grandparentsSibling")?.generation).toBe(-2);
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
    const partnershipEdges = [{ person1Id: "viktor", person2Id: "galina", isCurrent: true }];
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
    expect(result.nodes.find((n) => n.id === "bobsMother")?.generation).toBe(-1);
  });

  it("keeps a married couple immediately adjacent, ancestor fan model: husband's line fans left, wife's fans right", () => {
    // viktor's parents are motherA/fatherA; galina's parents are a wholly
    // separate couple, motherB/fatherB. viktor and galina are married —
    // they must still sit immediately next to each other (plain
    // SIBLING_X_SPACING apart) — but each spouse's own ancestor line now
    // fans out to their OWN side: viktor's parents end up to viktor's
    // left, galina's parents to galina's right, and the two fans never
    // share an x range (see file header comment's ANCESTOR LAYOUT MODEL).
    const result = buildFocusTreeLayout({
      persons: [
        person("motherA"),
        person("fatherA", { gender: "male" }),
        person("viktor", { gender: "male" }),
        person("motherB"),
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
    const fatherA = byId.get("fatherA")!;
    const fatherB = byId.get("fatherB")!;

    // Husband left, wife right, exactly the plain per-card spacing apart.
    expect(galina.x - viktor.x).toBe(244);
    // viktor's own parents sit on viktor's side (left of galina)...
    expect(fatherA.x).toBeLessThan(galina.x);
    // ...galina's own parents sit on galina's side (right of viktor).
    expect(fatherB.x).toBeGreaterThan(viktor.x);
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
    expect(Math.abs(aliceSpouse.x - alice.x)).toBe(244);
    // bob must sit on alice's OUTER side (away from her spouse), not between them.
    expect(Math.abs(bob.x - alice.x)).toBeLessThan(Math.abs(bob.x - aliceSpouse.x));
  });

  it("keeps the couple adjacent no matter how many siblings either spouse has", () => {
    // viktor has two siblings (viktorSib1, viktorSib2); galina has three
    // (galinaSib1..3) — a deliberately lopsided case. Regardless of how
    // wide either side's own sibling row grows, viktor and galina
    // themselves must stay exactly SIBLING_X_SPACING apart — the key
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
      partnershipEdges: [{ person1Id: "viktor", person2Id: "galina", isCurrent: true }],
      focusPersonId: "viktor",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    const viktor = byId.get("viktor")!;
    const galina = byId.get("galina")!;

    expect(Math.abs(galina.x - viktor.x)).toBe(244);

    // No two people at the SAME generation (i.e. the same visual row) share
    // an x position — a shared x across different rows is fine (they don't
    // occupy the same visual slot), so this checks per-generation, not globally.
    const xByGeneration = new Map<number, number[]>();
    for (const node of result.nodes) {
      if (!xByGeneration.has(node.generation)) xByGeneration.set(node.generation, []);
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
      partnershipEdges: [{ person1Id: "grandchild", person2Id: "grandchildSpouse", isCurrent: true }],
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
      if (!xByGeneration.has(node.generation)) xByGeneration.set(node.generation, []);
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
      if (!xByGeneration.has(node.generation)) xByGeneration.set(node.generation, []);
      xByGeneration.get(node.generation)!.push(node.x);
    }
    for (const [, xValues] of xByGeneration) {
      expect(new Set(xValues).size).toBe(xValues.length);
    }
  });
});
