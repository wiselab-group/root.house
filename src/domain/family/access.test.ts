import { describe, expect, it } from "vitest";
import { requireFamilyAccess } from "./access";
import { ForbiddenError } from "./errors";
import { roleSatisfies } from "./roles";
import type { FamilyDb, FamilyMemberRow } from "./family.repository";

function fakeDb(members: FamilyMemberRow[]): FamilyDb {
  return {
    query: {
      familyMembers: {
        // The real repository builds a Drizzle `and(eq(...), eq(...))` where-clause;
        // the fake doesn't need to interpret that SQL AST because each test scopes
        // its fixture to a single (familyId, userId) pair — "any row present" is
        // equivalent to "the row under test was found".
        findFirst: async () => members[0],
      },
    },
  };
}

describe("roleSatisfies", () => {
  it("owner satisfies all role requirements", () => {
    expect(roleSatisfies("owner", "viewer")).toBe(true);
    expect(roleSatisfies("owner", "editor")).toBe(true);
    expect(roleSatisfies("owner", "owner")).toBe(true);
  });

  it("editor satisfies viewer/editor but not owner", () => {
    expect(roleSatisfies("editor", "viewer")).toBe(true);
    expect(roleSatisfies("editor", "editor")).toBe(true);
    expect(roleSatisfies("editor", "owner")).toBe(false);
  });

  it("viewer only satisfies viewer", () => {
    expect(roleSatisfies("viewer", "viewer")).toBe(true);
    expect(roleSatisfies("viewer", "editor")).toBe(false);
    expect(roleSatisfies("viewer", "owner")).toBe(false);
  });
});

describe("requireFamilyAccess", () => {
  const familyId = "family-1";
  const userId = "user-1";

  it("resolves when the member's role exactly matches minRole", async () => {
    const db = fakeDb([{ id: "m1", familyId, userId, role: "editor" }]);
    const member = await requireFamilyAccess(familyId, userId, "editor", db);
    expect(member.role).toBe("editor");
  });

  it("resolves when the member's role exceeds minRole", async () => {
    const db = fakeDb([{ id: "m1", familyId, userId, role: "owner" }]);
    const member = await requireFamilyAccess(familyId, userId, "viewer", db);
    expect(member.role).toBe("owner");
  });

  it("throws ForbiddenError when the member's role is below minRole", async () => {
    const db = fakeDb([{ id: "m1", familyId, userId, role: "viewer" }]);
    await expect(requireFamilyAccess(familyId, userId, "editor", db)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws ForbiddenError when the user is not a member at all", async () => {
    const db = fakeDb([]);
    await expect(requireFamilyAccess(familyId, userId, "viewer", db)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws ForbiddenError for a non-existent family (no membership row can exist)", async () => {
    const db = fakeDb([]);
    await expect(
      requireFamilyAccess("nonexistent-family", userId, "viewer", db),
    ).rejects.toThrow(ForbiddenError);
  });
});
