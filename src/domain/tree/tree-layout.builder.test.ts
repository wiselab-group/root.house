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
});
