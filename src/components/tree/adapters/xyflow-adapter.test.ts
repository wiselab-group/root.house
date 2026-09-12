import { describe, expect, it } from "vitest";
import { toReactFlow, type UnionChildFlowEdge } from "./xyflow-adapter";
import type {
  LayoutEdge,
  LayoutNode,
  PersonNode,
  TreeLayoutGraph,
} from "@/domain/tree/tree-layout.builder";

function person(id: string): PersonNode {
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
  };
}

function node(
  id: string,
  x: number,
  y: number,
  generation: number,
): LayoutNode {
  return {
    id,
    kind: "person",
    personId: id,
    x,
    y,
    generation,
    isFocus: false,
    isIsolated: false,
    person: person(id),
  };
}

describe("toReactFlow — isMiddleSibling", () => {
  it("flags only the MIDDLE child (by x) of 3+ siblings off one parent, leaving both edge children unflagged (regression: the exact shape from the user's screenshot — each child's own turn is a distinct point, not a literally shared one)", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "grigory",
      nodes: [
        node("grigory", 0, 0, -1),
        node("svetlana", -200, 100, 0),
        node("natalia", 0, 100, 0),
        node("viktor", 200, 100, 0),
      ],
      edges: [
        {
          id: "pc1",
          kind: "parent_child",
          source: "grigory",
          target: "svetlana",
        },
        {
          id: "pc2",
          kind: "parent_child",
          source: "grigory",
          target: "natalia",
        },
        {
          id: "pc3",
          kind: "parent_child",
          source: "grigory",
          target: "viktor",
        },
      ],
    };

    const { edges } = toReactFlow(graph, "fam1", "fam-slug", "compact");
    const byTarget = new Map(
      edges.filter((e) => e.type === "parentChild").map((e) => [e.target, e]),
    );
    expect(byTarget.get("svetlana")?.data?.isMiddleSibling).toBeFalsy();
    expect(byTarget.get("natalia")?.data?.isMiddleSibling).toBe(true);
    expect(byTarget.get("viktor")?.data?.isMiddleSibling).toBeFalsy();
  });

  it("does NOT flag either child when a parent has only two children (no middle position exists)", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "grigory",
      nodes: [
        node("grigory", 0, 0, -1),
        node("left-child", -200, 100, 0),
        node("right-child", 200, 100, 0),
      ],
      edges: [
        {
          id: "pc1",
          kind: "parent_child",
          source: "grigory",
          target: "left-child",
        },
        {
          id: "pc2",
          kind: "parent_child",
          source: "grigory",
          target: "right-child",
        },
      ],
    };

    const { edges } = toReactFlow(graph, "fam1", "fam-slug", "compact");
    for (const edge of edges.filter((e) => e.type === "parentChild")) {
      expect(edge.data?.isMiddleSibling).toBeFalsy();
    }
  });

  it("does NOT flag an only child (nothing to be a middle sibling among)", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "grigory",
      nodes: [node("grigory", 0, 0, -1), node("only-child", 0, 100, 0)],
      edges: [
        {
          id: "pc1",
          kind: "parent_child",
          source: "grigory",
          target: "only-child",
        },
      ],
    };

    const { edges } = toReactFlow(graph, "fam1", "fam-slug", "compact");
    const edge = edges.find((e) => e.type === "parentChild")!;
    expect(edge.data?.isMiddleSibling).toBeFalsy();
  });

  it("does NOT flag two children of the SAME parent on DIFFERENT rows (e.g. after a stranded-only-child ancestry raise puts one sibling's branch on a different generation)", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "grigory",
      nodes: [
        node("grigory", 0, 0, -1),
        node("elena", -200, 100, 0),
        node("elizaveta-kupchik", 200, 260, 1), // different generation/row
      ],
      edges: [
        { id: "pc1", kind: "parent_child", source: "grigory", target: "elena" },
        {
          id: "pc2",
          kind: "parent_child",
          source: "grigory",
          target: "elizaveta-kupchik",
        },
      ],
    };

    const { edges } = toReactFlow(graph, "fam1", "fam-slug", "compact");
    for (const edge of edges.filter((e) => e.type === "parentChild")) {
      expect(edge.data?.isMiddleSibling).toBeFalsy();
    }
  });

  it("flags only the middle union child when 3+ children share one union partnership's row, keyed on the partnership (not either individual parent)", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "father",
      nodes: [
        node("father", -100, 0, -1),
        node("mother", 100, 0, -1),
        node("child-a", -200, 100, 0),
        node("child-b", 0, 100, 0),
        node("child-c", 200, 100, 0),
      ],
      edges: [
        {
          id: "spouse1",
          kind: "partnership",
          source: "father",
          target: "mother",
        },
        {
          id: "pc-a-f",
          kind: "parent_child",
          source: "father",
          target: "child-a",
        },
        {
          id: "pc-a-m",
          kind: "parent_child",
          source: "mother",
          target: "child-a",
        },
        {
          id: "pc-b-f",
          kind: "parent_child",
          source: "father",
          target: "child-b",
        },
        {
          id: "pc-b-m",
          kind: "parent_child",
          source: "mother",
          target: "child-b",
        },
        {
          id: "pc-c-f",
          kind: "parent_child",
          source: "father",
          target: "child-c",
        },
        {
          id: "pc-c-m",
          kind: "parent_child",
          source: "mother",
          target: "child-c",
        },
      ] as LayoutEdge[],
    };

    const { edges } = toReactFlow(graph, "fam1", "fam-slug", "compact");
    const unionEdges = edges.filter(
      (e): e is UnionChildFlowEdge => e.type === "unionChild",
    );
    const byTarget = new Map(unionEdges.map((e) => [e.target, e]));
    expect(byTarget.get("child-a")?.data?.isMiddleSibling).toBeFalsy();
    expect(byTarget.get("child-b")?.data?.isMiddleSibling).toBe(true);
    expect(byTarget.get("child-c")?.data?.isMiddleSibling).toBeFalsy();
  });

  it("does NOT flag a union's only child as a middle sibling", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "father",
      nodes: [
        node("father", -100, 0, -1),
        node("mother", 100, 0, -1),
        node("only-child", 0, 100, 0),
      ],
      edges: [
        {
          id: "spouse1",
          kind: "partnership",
          source: "father",
          target: "mother",
        },
        {
          id: "pc-f",
          kind: "parent_child",
          source: "father",
          target: "only-child",
        },
        {
          id: "pc-m",
          kind: "parent_child",
          source: "mother",
          target: "only-child",
        },
      ] as LayoutEdge[],
    };

    const { edges } = toReactFlow(graph, "fam1", "fam-slug", "compact");
    const unionEdge = edges.find(
      (e): e is UnionChildFlowEdge => e.type === "unionChild",
    )!;
    expect(unionEdge.data?.isMiddleSibling).toBeFalsy();
  });
});

describe("toReactFlow — trace hides overlapping shared stem", () => {
  it("hides a non-traced sibling's shared vertical stem down to their shared row's bend point when a sibling on the SAME row is traced (real bug: the two lines overlapped, the plain one showing through the traced one's dash gaps)", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "alexander",
      nodes: [
        node("viktor", -100, 0, -1),
        node("galina", 100, 0, -1),
        node("alexander", 100, 100, 0),
        node("daria", -100, 100, 0),
      ],
      edges: [
        {
          id: "spouse1",
          kind: "partnership",
          source: "viktor",
          target: "galina",
        },
        {
          id: "pc-viktor-alexander",
          kind: "parent_child",
          source: "viktor",
          target: "alexander",
        },
        {
          id: "pc-galina-alexander",
          kind: "parent_child",
          source: "galina",
          target: "alexander",
        },
        {
          id: "pc-viktor-daria",
          kind: "parent_child",
          source: "viktor",
          target: "daria",
        },
        {
          id: "pc-galina-daria",
          kind: "parent_child",
          source: "galina",
          target: "daria",
        },
      ] as LayoutEdge[],
    };

    const highlight = {
      tracePersonIds: new Set(["galina", "alexander"]),
      traceEdgeIds: new Set(["pc-galina-alexander"]),
      traceEdgeDirections: new Map([["pc-galina-alexander", 1 as const]]),
    };

    const { edges } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      highlight,
    );
    const unionEdges = edges.filter(
      (e): e is UnionChildFlowEdge => e.type === "unionChild",
    );
    const byTarget = new Map(unionEdges.map((e) => [e.target, e]));
    expect(byTarget.get("alexander")?.data?.isOnTracePath).toBe(true);
    expect(byTarget.get("alexander")?.data?.hideSharedStem).toBeFalsy();
    expect(byTarget.get("daria")?.data?.isOnTracePath).toBe(false);
    expect(byTarget.get("daria")?.data?.hideSharedStem).toBe(true);
  });

  it("does NOT hide the shared stem when the non-traced sibling is on a DIFFERENT row (elastic-Y repair moved their subtree) — hiding unconditionally would leave a visible gap since their own turn point no longer coincides", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "alexander",
      nodes: [
        node("viktor", -100, 0, -1),
        node("galina", 100, 0, -1),
        node("alexander", 100, 100, 0),
        node("daria", -100, 330, 1), // different row (y), e.g. after a repair shift
      ],
      edges: [
        {
          id: "spouse1",
          kind: "partnership",
          source: "viktor",
          target: "galina",
        },
        {
          id: "pc-viktor-alexander",
          kind: "parent_child",
          source: "viktor",
          target: "alexander",
        },
        {
          id: "pc-galina-alexander",
          kind: "parent_child",
          source: "galina",
          target: "alexander",
        },
        {
          id: "pc-viktor-daria",
          kind: "parent_child",
          source: "viktor",
          target: "daria",
        },
        {
          id: "pc-galina-daria",
          kind: "parent_child",
          source: "galina",
          target: "daria",
        },
      ] as LayoutEdge[],
    };

    const highlight = {
      tracePersonIds: new Set(["galina", "alexander"]),
      traceEdgeIds: new Set(["pc-galina-alexander"]),
      traceEdgeDirections: new Map([["pc-galina-alexander", 1 as const]]),
    };

    const { edges } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      highlight,
    );
    const unionEdges = edges.filter(
      (e): e is UnionChildFlowEdge => e.type === "unionChild",
    );
    const byTarget = new Map(unionEdges.map((e) => [e.target, e]));
    expect(byTarget.get("daria")?.data?.hideSharedStem).toBeFalsy();
  });
});
