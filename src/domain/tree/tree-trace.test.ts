import { describe, expect, it } from "vitest";
import { buildFocusTreeLayout, type PersonNode } from "./tree-layout.builder";
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

describe("applyRelationshipTrace", () => {
  it("marks no nodes/edges when outcome is null", () => {
    const graph = buildFocusTreeLayout({
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
    const graph = buildFocusTreeLayout({
      persons: [person("alice"), person("bob")],
      parentChildEdges: [],
      partnershipEdges: [],
      focusPersonId: "alice",
    });
    const outcome: RelationshipPathOutcome = { status: "unrelated", personAId: "alice", personBId: "bob" };
    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds.size).toBe(0);
    expect(traced.traceStatus).toBe("unrelated");
  });

  it("marks every person and edge on a found path", () => {
    const graph = buildFocusTreeLayout({
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
        { fromId: "alice", toId: "father", edgeKind: "parent_child", direction: "up", parentRole: "biological" },
        { fromId: "father", toId: "grandparent", edgeKind: "parent_child", direction: "up", parentRole: "biological" },
      ],
      commonAncestorId: "grandparent",
      relationship: { label: "grandparent", commonAncestorId: "grandparent", removed: 1 },
    };

    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds).toEqual(new Set(["alice", "father", "grandparent"]));
    expect(traced.traceEdgeIds.size).toBe(2);
    expect(traced.traceStatus).toBe("found");
  });

  it("does not mark edges/nodes that fall outside the currently visible layout window", () => {
    // Layout only shows alice + father (descendantGenerations/ancestorGenerations=1),
    // but the path outcome includes a great-grandparent beyond that window.
    const graph = buildFocusTreeLayout({
      persons: [person("father"), person("alice")],
      parentChildEdges: [{ parentId: "father", childId: "alice" }],
      partnershipEdges: [],
      focusPersonId: "alice",
      ancestorGenerations: 1,
    });

    const outcome: RelationshipPathOutcome = {
      status: "found",
      personAId: "alice",
      personBId: "great-grandparent",
      personIds: ["alice", "father", "grandparent", "great-grandparent"],
      steps: [],
      commonAncestorId: "great-grandparent",
      relationship: { label: "grandparent", commonAncestorId: "great-grandparent" },
    };

    const traced = applyRelationshipTrace(graph, outcome);
    expect(traced.tracePersonIds).toEqual(new Set(["alice", "father"]));
    expect(traced.tracePersonIds.has("grandparent")).toBe(false);
  });

  it("marks a partnership edge (down-then-lateral path shape) as on-path when both endpoints are consecutive in personIds", () => {
    const graph = buildFocusTreeLayout({
      persons: [person("alice"), person("bob")],
      parentChildEdges: [],
      partnershipEdges: [{ person1Id: "alice", person2Id: "bob", isCurrent: true }],
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
    const graph = buildFocusTreeLayout({
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
