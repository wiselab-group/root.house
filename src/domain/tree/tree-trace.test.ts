import { describe, expect, it } from "vitest";
import type {
  LayoutEdge,
  LayoutNode,
  PersonNode,
  TreeLayoutGraph,
} from "./tree-layout.builder";
import { applyRelationshipTrace } from "./tree-trace";
import type { RelationshipPathOutcome } from "@/domain/relationship/genealogy-algorithms";

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

/**
 * Builds a TreeLayoutGraph by hand — applyRelationshipTrace is algorithm-
 * agnostic (it only reads TreeLayoutGraph.nodes/.edges), so these tests
 * never need a real layout engine, just a graph in the right shape. x/y/
 * generation are arbitrary placeholders. A person NOT listed in `persons`
 * is simply absent from the resulting graph — this is how the "outside the
 * currently visible layout window" test below simulates a windowed view,
 * without any windowing support in the graph builder itself.
 */
function buildGraph(input: {
  persons: PersonNode[];
  parentChildEdges: { parentId: string; childId: string }[];
  partnershipEdges: {
    person1Id: string;
    person2Id: string;
    isCurrent: boolean;
  }[];
  focusPersonId: string;
}): TreeLayoutGraph {
  const nodes: LayoutNode[] = input.persons.map((p, i) => ({
    id: p.id,
    kind: "person",
    personId: p.id,
    x: i * 100,
    y: 0,
    generation: 0,
    isFocus: p.id === input.focusPersonId,
    isIsolated: false,
    person: p,
  }));
  const edges: LayoutEdge[] = [
    ...input.parentChildEdges.map((e) => ({
      id: `pc-${e.parentId}-${e.childId}`,
      kind: "parent_child" as const,
      source: e.parentId,
      target: e.childId,
    })),
    ...input.partnershipEdges.map((e) => ({
      id: `partner-${e.person1Id}-${e.person2Id}`,
      kind: "partnership" as const,
      source: e.person1Id,
      target: e.person2Id,
      isCurrent: e.isCurrent,
    })),
  ];
  return { nodes, edges, focusPersonId: input.focusPersonId };
}

describe("applyRelationshipTrace", () => {
  it("marks no nodes/edges when outcome is null", () => {
    const graph = buildGraph({
      persons: [person("alice")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "alice",
    });
    const traced = applyRelationshipTrace(graph, null);
    expect(traced.tracePersonIds.size).toBe(0);
    expect(traced.traceEdgeIds.size).toBe(0);
    expect(traced.traceStatus).toBeNull();
  });

  it("marks no nodes/edges when the outcome is unrelated", () => {
    const graph = buildGraph({
      persons: [person("alice"), person("bob")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "alice",
    });
    const outcome: RelationshipPathOutcome = {
      status: "unrelated",
      personAId: "alice",
      personBId: "bob",
    };
    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds.size).toBe(0);
    expect(traced.traceStatus).toBe("unrelated");
  });

  it("marks every person and edge on a found path", () => {
    const graph = buildGraph({
      persons: [person("grandparent"), person("father"), person("alice")],
      parentChildEdges: [
        { parentId: "grandparent", childId: "father" },
        { parentId: "father", childId: "alice" },
      ],
      partnershipEdges: [],
      focusPersonId: "alice",
    });

    const outcome: RelationshipPathOutcome = {
      status: "found",
      personAId: "alice",
      personBId: "grandparent",
      personIds: ["alice", "father", "grandparent"],
      steps: [
        {
          fromId: "alice",
          toId: "father",
          edgeKind: "parent_child",
          direction: "up",
          parentRole: "biological",
        },
        {
          fromId: "father",
          toId: "grandparent",
          edgeKind: "parent_child",
          direction: "up",
          parentRole: "biological",
        },
      ],
      commonAncestorId: "grandparent",
      relationship: {
        label: "grandparent",
        commonAncestorId: "grandparent",
        removed: 1,
      },
    };

    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds).toEqual(
      new Set(["alice", "father", "grandparent"]),
    );
    expect(traced.traceEdgeIds.size).toBe(2);
    expect(traced.traceStatus).toBe("found");
  });

  it("does not mark edges/nodes that fall outside the currently visible layout window", () => {
    // Layout only shows alice + father (a windowed view showing 1 ancestor
    // generation), but the path outcome includes a great-grandparent beyond
    // that window — simulated here by simply omitting grandparent/
    // great-grandparent from the graph's own persons/nodes.
    const graph = buildGraph({
      persons: [person("father"), person("alice")],
      parentChildEdges: [{ parentId: "father", childId: "alice" }],
      partnershipEdges: [],
      focusPersonId: "alice",
    });

    const outcome: RelationshipPathOutcome = {
      status: "found",
      personAId: "alice",
      personBId: "great-grandparent",
      personIds: ["alice", "father", "grandparent", "great-grandparent"],
      steps: [],
      commonAncestorId: "great-grandparent",
      relationship: {
        label: "grandparent",
        commonAncestorId: "great-grandparent",
      },
    };

    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds).toEqual(new Set(["alice", "father"]));
    expect(traced.tracePersonIds.has("grandparent")).toBe(false);
  });

  it("marks a partnership edge (down-then-lateral path shape) as on-path when both endpoints are consecutive in personIds", () => {
    const graph = buildGraph({
      persons: [person("alice"), person("bob")],
      parentChildEdges: [],
      partnershipEdges: [
        { person1Id: "alice", person2Id: "bob", isCurrent: true },
      ],
      focusPersonId: "alice",
    });

    const outcome: RelationshipPathOutcome = {
      status: "found",
      personAId: "alice",
      personBId: "bob",
      personIds: ["alice", "bob"],
      steps: [{ fromId: "alice", toId: "bob", edgeKind: "partnership" }],
      commonAncestorId: null,
      relationship: { label: "unrelated", commonAncestorId: null },
    };

    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.traceEdgeIds.size).toBe(1);
  });

  it("handles the same-person case (single node, no edges)", () => {
    const graph = buildGraph({
      persons: [person("alice")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "alice",
    });
    const outcome: RelationshipPathOutcome = {
      status: "found",
      personAId: "alice",
      personBId: "alice",
      personIds: ["alice"],
      steps: [],
      commonAncestorId: "alice",
      relationship: { label: "same person", commonAncestorId: "alice" },
    };
    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds).toEqual(new Set(["alice"]));
    expect(traced.traceEdgeIds.size).toBe(0);
  });
});
