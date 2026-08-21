import { describe, expect, it } from "vitest";
import { deriveSiblings, type ParentChildEdge } from "./sibling-derivation";

describe("deriveSiblings", () => {
  it("returns nothing for a person with no recorded parents", () => {
    const edges: ParentChildEdge[] = [{ parentId: "mother", childId: "other-child" }];
    expect(deriveSiblings("orphan", edges)).toEqual([]);
  });

  it("finds a full sibling sharing both parents", () => {
    const edges: ParentChildEdge[] = [
      { parentId: "mother", childId: "alice" },
      { parentId: "father", childId: "alice" },
      { parentId: "mother", childId: "bob" },
      { parentId: "father", childId: "bob" },
    ];
    const result = deriveSiblings("alice", edges);
    expect(result).toEqual([{ personId: "bob", sharedParentCount: 2 }]);
  });

  it("finds a half-sibling sharing exactly one parent", () => {
    const edges: ParentChildEdge[] = [
      { parentId: "mother", childId: "alice" },
      { parentId: "father", childId: "alice" },
      { parentId: "mother", childId: "carol" },
      { parentId: "other-father", childId: "carol" },
    ];
    const result = deriveSiblings("alice", edges);
    expect(result).toEqual([{ personId: "carol", sharedParentCount: 1 }]);
  });

  it("never includes the person themselves", () => {
    const edges: ParentChildEdge[] = [{ parentId: "mother", childId: "alice" }];
    const result = deriveSiblings("alice", edges);
    expect(result.find((s) => s.personId === "alice")).toBeUndefined();
  });

  it("does not treat a parent's own parent as a sibling", () => {
    // grandparent -> mother -> alice; grandparent is not alice's sibling.
    const edges: ParentChildEdge[] = [
      { parentId: "grandparent", childId: "mother" },
      { parentId: "mother", childId: "alice" },
    ];
    const result = deriveSiblings("alice", edges);
    expect(result).toEqual([]);
  });

  it("handles multiple siblings with mixed full/half relationships", () => {
    const edges: ParentChildEdge[] = [
      { parentId: "mother", childId: "alice" },
      { parentId: "father", childId: "alice" },
      { parentId: "mother", childId: "bob" },
      { parentId: "father", childId: "bob" }, // full sibling of alice
      { parentId: "mother", childId: "carol" }, // half-sibling of alice (shares mother only)
    ];
    const result = deriveSiblings("alice", edges).sort((a, b) => a.personId.localeCompare(b.personId));
    expect(result).toEqual([
      { personId: "bob", sharedParentCount: 2 },
      { personId: "carol", sharedParentCount: 1 },
    ]);
  });
});
