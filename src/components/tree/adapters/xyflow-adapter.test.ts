import { describe, expect, it } from "vitest";
import {
  toReactFlow,
  type UnionChildFlowEdge,
  type RelationshipFlowEdge,
} from "./xyflow-adapter";
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

describe("toReactFlow — trace on a union with a non-traced sibling", () => {
  // Regression fixture for a real overlap bug (Виктор+Галина → Александр
  // traced, Дарья not): the FIX for it now lives entirely in rendering
  // (union-child-edge.tsx/relationship-edge.tsx's TracedLine draws a solid
  // backdrop under every traced line, occluding whatever's underneath
  // unconditionally — see TracedLine's own doc comment), not in this data
  // layer. This just guards the data contract TracedLine's fix depends on:
  // exactly one sibling ends up isOnTracePath, the other doesn't.
  it("marks only the traced sibling's own union-child edge as isOnTracePath, leaving the other sibling's plain and undisturbed", () => {
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
    expect(byTarget.get("daria")?.data?.isOnTracePath).toBe(false);
  });
});

describe("toReactFlow — union collapse badge (2026-09-12 change: badge moves off the card and onto the partnership line when a couple shares a child)", () => {
  function buildUnionGraph(): TreeLayoutGraph {
    return {
      focusPersonId: "viktor",
      nodes: [
        node("viktor", -100, 0, 0),
        node("galina", 100, 0, 0),
        node("child", 0, 200, 1),
      ],
      edges: [
        {
          id: "partner-1",
          kind: "partnership",
          source: "viktor",
          target: "galina",
        },
        {
          id: "pc-viktor-child",
          kind: "parent_child",
          source: "viktor",
          target: "child",
        },
        {
          id: "pc-galina-child",
          kind: "parent_child",
          source: "galina",
          target: "child",
        },
      ],
    };
  }

  it("a partnership edge with a shared child carries unionCollapse data when onToggleCollapse is provided", () => {
    const graph = buildUnionGraph();
    const { edges } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      {},
      () => {},
      false,
      undefined,
      () => {},
    );
    const partnershipEdge = edges.find(
      (e): e is RelationshipFlowEdge => e.type === "partnership",
    );
    expect(partnershipEdge?.data?.unionCollapse?.collapseKey).toBe(
      "union:partner-1",
    );
  });

  it("neither parent's own card gets hasChildren — their shared child is entirely covered by the union badge", () => {
    const graph = buildUnionGraph();
    const { nodes } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      {},
      () => {},
      false,
      undefined,
      () => {},
    );
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get("viktor")?.data.hasChildren).toBe(false);
    expect(byId.get("galina")?.data.hasChildren).toBe(false);
  });

  it("in read-only mode, no unionCollapse is attached even though the couple shares a child", () => {
    const graph = buildUnionGraph();
    const { edges } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      {},
      () => {},
      true, // readOnly
    );
    const partnershipEdge = edges.find(
      (e): e is RelationshipFlowEdge => e.type === "partnership",
    );
    expect(partnershipEdge?.data?.unionCollapse).toBeUndefined();
  });

  it("a childless partnership carries no unionCollapse data", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "viktor",
      nodes: [node("viktor", -100, 0, 0), node("galina", 100, 0, 0)],
      edges: [
        {
          id: "partner-1",
          kind: "partnership",
          source: "viktor",
          target: "galina",
        },
      ],
    };
    const { edges } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      {},
      () => {},
      false,
      undefined,
      () => {},
    );
    const partnershipEdge = edges.find(
      (e): e is RelationshipFlowEdge => e.type === "partnership",
    );
    expect(partnershipEdge?.data?.unionCollapse).toBeUndefined();
  });

  it("a solo child (only one recorded parent) still gives that parent their own card-level badge", () => {
    const graph: TreeLayoutGraph = {
      focusPersonId: "viktor",
      nodes: [node("viktor", 0, 0, 0), node("child", 0, 200, 1)],
      edges: [
        {
          id: "pc-viktor-child",
          kind: "parent_child",
          source: "viktor",
          target: "child",
        },
      ],
    };
    const { nodes } = toReactFlow(
      graph,
      "fam1",
      "fam-slug",
      "compact",
      {},
      () => {},
      false,
      undefined,
      () => {},
    );
    const viktor = nodes.find((n) => n.id === "viktor");
    expect(viktor?.data.hasChildren).toBe(true);
  });
});
