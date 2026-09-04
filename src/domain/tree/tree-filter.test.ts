import { describe, expect, it } from "vitest";
import { buildFocusTreeLayout, type PersonNode } from "./tree-layout.builder";
import {
  applyFilter,
  isEmptyFilter,
  matchesFilter,
  type PersonFilter,
} from "./tree-filter";

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

describe("isEmptyFilter", () => {
  it("is true for an empty object", () => {
    expect(isEmptyFilter({})).toBe(true);
  });

  it("is false once any criterion is set", () => {
    expect(isEmptyFilter({ gender: ["male"] })).toBe(false);
  });
});

describe("matchesFilter", () => {
  it("matches everyone when the filter is empty (no criteria to check)", () => {
    expect(matchesFilter(person("a"), {})).toBe(true);
  });

  it("filters by religion", () => {
    const filter: PersonFilter = { religion: ["orthodox"] };
    expect(matchesFilter(person("a", { religion: "orthodox" }), filter)).toBe(
      true,
    );
    expect(matchesFilter(person("b", { religion: "catholic" }), filter)).toBe(
      false,
    );
    expect(matchesFilter(person("c", { religion: null }), filter)).toBe(false);
  });

  it("filters by nationality", () => {
    const filter: PersonFilter = { nationality: ["russian", "ukrainian"] };
    expect(matchesFilter(person("a", { nationality: "russian" }), filter)).toBe(
      true,
    );
    expect(matchesFilter(person("b", { nationality: "german" }), filter)).toBe(
      false,
    );
  });

  it("filters by gender", () => {
    const filter: PersonFilter = { gender: ["female"] };
    expect(matchesFilter(person("a", { gender: "female" }), filter)).toBe(true);
    expect(matchesFilter(person("b", { gender: "male" }), filter)).toBe(false);
  });

  it("filters by isLiving", () => {
    const filter: PersonFilter = { isLiving: false };
    expect(matchesFilter(person("a", { isLiving: false }), filter)).toBe(true);
    expect(matchesFilter(person("b", { isLiving: true }), filter)).toBe(false);
  });

  it("filters by birth year range, excluding unknown birth years", () => {
    const filter: PersonFilter = { birthYearFrom: 1900, birthYearTo: 1950 };
    expect(matchesFilter(person("a", { birthYear: 1920 }), filter)).toBe(true);
    expect(matchesFilter(person("b", { birthYear: 1960 }), filter)).toBe(false);
    expect(matchesFilter(person("c", { birthYear: null }), filter)).toBe(false);
  });

  it("filters by death year range, excluding unknown death years", () => {
    const filter: PersonFilter = { deathYearFrom: 2000 };
    expect(matchesFilter(person("a", { deathYear: 2010 }), filter)).toBe(true);
    expect(matchesFilter(person("b", { deathYear: 1990 }), filter)).toBe(false);
    expect(matchesFilter(person("c", { deathYear: null }), filter)).toBe(false);
  });

  it("ANDs multiple criteria together", () => {
    const filter: PersonFilter = { gender: ["male"], religion: ["orthodox"] };
    expect(
      matchesFilter(
        person("a", { gender: "male", religion: "orthodox" }),
        filter,
      ),
    ).toBe(true);
    expect(
      matchesFilter(
        person("b", { gender: "male", religion: "catholic" }),
        filter,
      ),
    ).toBe(false);
  });
});

describe("applyFilter — highlight mode (default)", () => {
  const graph = buildFocusTreeLayout({
    persons: [
      person("alice", { religion: "orthodox" }),
      person("bob", { religion: "catholic" }),
      person("carol"),
    ],
    parentChildEdges: [
      { parentId: "alice", childId: "carol" },
      { parentId: "bob", childId: "carol" },
    ],
    partnershipEdges: [
      { person1Id: "alice", person2Id: "bob", isCurrent: true },
    ],
    focusPersonId: "carol",
  });

  it("keeps every node in the graph — structure is never destroyed", () => {
    const filtered = applyFilter(
      graph,
      { religion: ["orthodox"] },
      "highlight",
    );
    expect(filtered.nodes).toHaveLength(graph.nodes.length);
    expect(filtered.edges).toHaveLength(graph.edges.length);
  });

  it("marks only matching people in matchedIds", () => {
    const filtered = applyFilter(
      graph,
      { religion: ["orthodox"] },
      "highlight",
    );
    expect(filtered.matchedIds.has("alice")).toBe(true);
    expect(filtered.matchedIds.has("bob")).toBe(false);
    expect(filtered.matchedIds.has("carol")).toBe(false);
  });

  it("defaults to highlight mode when mode is omitted", () => {
    const filtered = applyFilter(graph, { religion: ["orthodox"] });
    expect(filtered.mode).toBe("highlight");
    expect(filtered.nodes).toHaveLength(graph.nodes.length);
  });

  it("an empty filter matches everyone (matchedIds == all nodes)", () => {
    const filtered = applyFilter(graph, {}, "highlight");
    expect(filtered.matchedIds.size).toBe(graph.nodes.length);
  });
});

describe("applyFilter — focus mode", () => {
  it("preserves full structure like highlight (styling-only distinction)", () => {
    const graph = buildFocusTreeLayout({
      persons: [person("alice", { religion: "orthodox" }), person("bob")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "alice",
    });
    const filtered = applyFilter(graph, { religion: ["orthodox"] }, "focus");
    expect(filtered.nodes).toHaveLength(graph.nodes.length);
    expect(filtered.mode).toBe("focus");
  });
});

describe("applyFilter — hide mode", () => {
  const graph = buildFocusTreeLayout({
    persons: [
      person("alice", { religion: "orthodox" }),
      person("bob", { religion: "catholic" }),
      person("carol"),
    ],
    parentChildEdges: [
      { parentId: "alice", childId: "carol" },
      { parentId: "bob", childId: "carol" },
    ],
    partnershipEdges: [
      { person1Id: "alice", person2Id: "bob", isCurrent: true },
    ],
    focusPersonId: "carol",
  });

  it("removes non-matching nodes", () => {
    const filtered = applyFilter(graph, { religion: ["orthodox"] }, "hide");
    expect(filtered.nodes.map((n) => n.id)).toEqual(["alice"]);
  });

  it("drops any edge touching a removed node — no dangling edges", () => {
    const filtered = applyFilter(graph, { religion: ["orthodox"] }, "hide");
    expect(filtered.edges).toEqual([]);
  });

  it("keeps an edge only when both endpoints survive the filter", () => {
    const filtered = applyFilter(
      graph,
      { religion: ["orthodox", "catholic"] },
      "hide",
    );
    expect(filtered.nodes.map((n) => n.id).sort()).toEqual(["alice", "bob"]);
    expect(filtered.edges).toHaveLength(1);
    expect(filtered.edges[0].kind).toBe("partnership");
  });

  it("preserves focusPersonId even when the focus person itself is filtered out", () => {
    const filtered = applyFilter(graph, { religion: ["catholic"] }, "hide");
    expect(filtered.focusPersonId).toBe("carol");
    expect(filtered.nodes.map((n) => n.id)).toEqual(["bob"]);
  });
});
