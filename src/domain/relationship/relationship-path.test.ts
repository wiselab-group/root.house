import { describe, expect, it } from "vitest";
import { computeRelationshipPath } from "./relationship-path";

describe("computeRelationshipPath", () => {
  it("identifies the same person", () => {
    const result = computeRelationshipPath("alice", "alice", new Map(), new Map());
    expect(result.label).toBe("same person");
  });

  it("identifies a direct parent (A is B's parent)", () => {
    // B's ancestors: A at depth 1.
    const ancestorsB = new Map([["alice", 1]]);
    const result = computeRelationshipPath("alice", "bob", new Map(), ancestorsB);
    expect(result).toMatchObject({ label: "parent", commonAncestorId: "alice" });
  });

  it("identifies a direct child (A is B's child)", () => {
    // A's ancestors: B at depth 1 => B is A's parent => A is B's child.
    const ancestorsA = new Map([["bob", 1]]);
    const result = computeRelationshipPath("alice", "bob", ancestorsA, new Map());
    expect(result).toMatchObject({ label: "child", commonAncestorId: "bob" });
  });

  it("identifies a grandparent relationship", () => {
    const ancestorsB = new Map([["alice", 2]]);
    const result = computeRelationshipPath("alice", "bob", new Map(), ancestorsB);
    expect(result.label).toBe("grandparent");
    expect(result.removed).toBe(1);
  });

  it("identifies siblings (share a parent at depth 1 each)", () => {
    const ancestorsA = new Map([["mother", 1], ["father", 1]]);
    const ancestorsB = new Map([["mother", 1], ["father", 1]]);
    const result = computeRelationshipPath("alice", "bob", ancestorsA, ancestorsB);
    expect(result.label).toBe("sibling");
  });

  it("identifies an aunt/uncle relationship", () => {
    // Alice: parent depth 1 (her father) who is bob's sibling via grandparent.
    // Bob's child (niece/nephew of alice) would have grandparent at depth 2.
    // Model: common ancestor "grandparent" — alice at depth 1 (grandparent is her parent),
    // niece at depth 2 (grandparent is niece's grandparent).
    const ancestorsAlice = new Map([["grandparent", 1]]);
    const ancestorsNiece = new Map([["grandparent", 2]]);
    const result = computeRelationshipPath("alice", "niece", ancestorsAlice, ancestorsNiece);
    expect(result.label).toBe("aunt_or_uncle");
    expect(result.removed).toBe(1);
  });

  it("identifies the reverse of aunt/uncle as niece/nephew", () => {
    const ancestorsNiece = new Map([["grandparent", 2]]);
    const ancestorsAlice = new Map([["grandparent", 1]]);
    const result = computeRelationshipPath("niece", "alice", ancestorsNiece, ancestorsAlice);
    expect(result.label).toBe("niece_or_nephew");
  });

  it("identifies first cousins (both share a grandparent at depth 2)", () => {
    const ancestorsA = new Map([["grandparent", 2]]);
    const ancestorsB = new Map([["grandparent", 2]]);
    const result = computeRelationshipPath("cousin1", "cousin2", ancestorsA, ancestorsB);
    expect(result).toMatchObject({ label: "cousin", cousinDegree: 1, removed: 0 });
  });

  it("identifies a first cousin once removed", () => {
    const ancestorsA = new Map([["grandparent", 2]]);
    const ancestorsB = new Map([["grandparent", 3]]);
    const result = computeRelationshipPath("cousin1", "cousin2child", ancestorsA, ancestorsB);
    expect(result).toMatchObject({ label: "cousin", cousinDegree: 1, removed: 1 });
  });

  it("identifies second cousins (share a great-grandparent at depth 3)", () => {
    const ancestorsA = new Map([["great-grandparent", 3]]);
    const ancestorsB = new Map([["great-grandparent", 3]]);
    const result = computeRelationshipPath("a", "b", ancestorsA, ancestorsB);
    expect(result).toMatchObject({ label: "cousin", cousinDegree: 2, removed: 0 });
  });

  it("reports unrelated when there is no shared ancestor", () => {
    const ancestorsA = new Map([["family-a-parent", 1]]);
    const ancestorsB = new Map([["family-b-parent", 1]]);
    const result = computeRelationshipPath("a", "b", ancestorsA, ancestorsB);
    expect(result).toEqual({ label: "unrelated", commonAncestorId: null });
  });

  it("picks the lowest common ancestor when multiple shared ancestors exist", () => {
    // Both share "grandparent" (depth 2 each -> cousins) AND "great-grandparent"
    // (depth 3 each). The closer one (grandparent, combined depth 4) should win
    // over the more distant one (great-grandparent, combined depth 6).
    const ancestorsA = new Map([
      ["grandparent", 2],
      ["great-grandparent", 3],
    ]);
    const ancestorsB = new Map([
      ["grandparent", 2],
      ["great-grandparent", 3],
    ]);
    const result = computeRelationshipPath("a", "b", ancestorsA, ancestorsB);
    expect(result.commonAncestorId).toBe("grandparent");
    expect(result.cousinDegree).toBe(1);
  });
});
