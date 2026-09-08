import { describe, expect, it } from "vitest";
import { isLastOwnerDemotion, type MemberRoleRow } from "./member-guard";

describe("isLastOwnerDemotion", () => {
  it("true when demoting the sole owner to a lower role", () => {
    const members: MemberRoleRow[] = [{ userId: "u1", role: "owner" }];
    expect(isLastOwnerDemotion(members, "u1", "editor")).toBe(true);
  });

  it("true when removing the sole owner (newRole=null)", () => {
    const members: MemberRoleRow[] = [{ userId: "u1", role: "owner" }];
    expect(isLastOwnerDemotion(members, "u1", null)).toBe(true);
  });

  it("false when there is another remaining owner", () => {
    const members: MemberRoleRow[] = [
      { userId: "u1", role: "owner" },
      { userId: "u2", role: "owner" },
    ];
    expect(isLastOwnerDemotion(members, "u1", "editor")).toBe(false);
  });

  it("false when the target isn't currently an owner", () => {
    const members: MemberRoleRow[] = [
      { userId: "u1", role: "owner" },
      { userId: "u2", role: "editor" },
    ];
    expect(isLastOwnerDemotion(members, "u2", "viewer")).toBe(false);
  });

  it("false when the target isn't found in the member list", () => {
    const members: MemberRoleRow[] = [{ userId: "u1", role: "owner" }];
    expect(isLastOwnerDemotion(members, "unknown", "viewer")).toBe(false);
  });

  it("false when staying/becoming owner (never reduces the owner count)", () => {
    const members: MemberRoleRow[] = [{ userId: "u1", role: "owner" }];
    expect(isLastOwnerDemotion(members, "u1", "owner")).toBe(false);
  });
});
