import { describe, expect, it } from "vitest";
import { buildFocusTreeLayout, type PersonNode } from "./tree-layout.builder";

function person(id: string, overrides: Partial<PersonNode> = {}): PersonNode {
  return {
    id,
    firstName: id,
    lastName: null,
    nickname: null,
    isPlaceholder: false,
    isLiving: true,
    birthYear: null,
    deathYear: null,
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
    expect(result.nodes[0]).toMatchObject({ id: "alice", generation: 0, isFocus: true });
    expect(result.edges).toEqual([]);
  });

  it("places parents at generation -1 and children at generation +1", () => {
    const result = buildFocusTreeLayout({
      persons: [person("mother"), person("father"), person("alice"), person("child")],
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
      persons: [person("great-grandparent"), person("grandparent"), person("parent"), person("alice")],
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
      partnershipEdges: [{ person1Id: "alice", person2Id: "spouse", isCurrent: true }],
      focusPersonId: "alice",
    });

    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    expect(byId.get("spouse")?.generation).toBe(0);
    expect(result.edges).toContainEqual(
      expect.objectContaining({ kind: "partnership", source: "alice", target: "spouse" }),
    );
  });

  it("only emits edges where both endpoints are within the visible slice", () => {
    // grandparent -> parent -> alice -> child -> grandchild(too far, excluded with generations=1)
    const result = buildFocusTreeLayout({
      persons: [person("parent"), person("alice"), person("child"), person("grandchild")],
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
});
