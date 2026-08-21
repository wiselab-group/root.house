import { describe, expect, it } from "vitest";
import { RelationshipValidationError, validateParentChild, validatePartnership } from "./relationship.service";

const FAMILY_ID = "family-1";

/** Fake personExists: every id in `existingIds` "exists"; everything else doesn't. */
function fakePersonExists(existingIds: string[]) {
  return async (personId: string) => (existingIds.includes(personId) ? { id: personId } : null);
}

/** Fake isAncestorOf driven by an explicit adjacency map: ancestorMap[x] = direct ancestors of x. */
function fakeIsAncestorOf(ancestorMap: Record<string, string[]>) {
  return async (candidateAncestorId: string, personId: string): Promise<boolean> => {
    const visited = new Set<string>();
    const queue = [...(ancestorMap[personId] ?? [])];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === candidateAncestorId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      queue.push(...(ancestorMap[current] ?? []));
    }
    return false;
  };
}

describe("validateParentChild", () => {
  it("rejects a person being their own parent", async () => {
    await expect(
      validateParentChild(
        FAMILY_ID,
        { parentId: "p1", childId: "p1" },
        { personExists: fakePersonExists(["p1"]), isAncestorOf: fakeIsAncestorOf({}) },
      ),
    ).rejects.toThrow(RelationshipValidationError);
  });

  it("rejects when either person doesn't exist in the family", async () => {
    await expect(
      validateParentChild(
        FAMILY_ID,
        { parentId: "p1", childId: "ghost" },
        { personExists: fakePersonExists(["p1"]), isAncestorOf: fakeIsAncestorOf({}) },
      ),
    ).rejects.toThrow(RelationshipValidationError);
  });

  it("rejects an edge that would create a cycle", async () => {
    // p1 is already an ancestor of p2 (p2 -> p1 in ancestorMap terms: p1 is p2's parent).
    // Proposing p2 as a parent of p1 would close the loop.
    const ancestorMap = { p2: ["p1"] };
    await expect(
      validateParentChild(
        FAMILY_ID,
        { parentId: "p2", childId: "p1" },
        { personExists: fakePersonExists(["p1", "p2"]), isAncestorOf: fakeIsAncestorOf(ancestorMap) },
      ),
    ).rejects.toThrow(/цикл/);
  });

  it("accepts a valid, acyclic parent-child edge", async () => {
    await expect(
      validateParentChild(
        FAMILY_ID,
        { parentId: "grandparent", childId: "parent" },
        {
          personExists: fakePersonExists(["grandparent", "parent"]),
          isAncestorOf: fakeIsAncestorOf({ parent: [] }),
        },
      ),
    ).resolves.toBeUndefined();
  });

  it("accepts a deep, indirect acyclic edge (3+ generations)", async () => {
    // existing chain: child -> parent -> grandparent. Proposing great-grandparent -> grandparent is fine.
    const ancestorMap = { grandparent: ["parent"], parent: ["child"] };
    await expect(
      validateParentChild(
        FAMILY_ID,
        { parentId: "great-grandparent", childId: "grandparent" },
        {
          personExists: fakePersonExists(["great-grandparent", "grandparent", "parent", "child"]),
          isAncestorOf: fakeIsAncestorOf(ancestorMap),
        },
      ),
    ).resolves.toBeUndefined();
  });
});

describe("validatePartnership", () => {
  it("rejects a person partnered with themselves", async () => {
    await expect(
      validatePartnership(
        FAMILY_ID,
        { person1Id: "p1", person2Id: "p1" },
        { personExists: fakePersonExists(["p1"]) },
      ),
    ).rejects.toThrow(RelationshipValidationError);
  });

  it("rejects when either partner doesn't exist in the family", async () => {
    await expect(
      validatePartnership(
        FAMILY_ID,
        { person1Id: "p1", person2Id: "ghost" },
        { personExists: fakePersonExists(["p1"]) },
      ),
    ).rejects.toThrow(RelationshipValidationError);
  });

  it("accepts a valid partnership between two existing people", async () => {
    await expect(
      validatePartnership(
        FAMILY_ID,
        { person1Id: "p1", person2Id: "p2" },
        { personExists: fakePersonExists(["p1", "p2"]) },
      ),
    ).resolves.toBeUndefined();
  });
});
