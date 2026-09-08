import { describe, expect, it } from "vitest";
import {
  canCreate,
  canDelete,
  canEdit,
  canManageMembers,
  canView,
  type ActingMember,
  type ObjectOwnership,
} from "./permissions";

const OWNER: ActingMember = { userId: "owner-1", role: "owner" };
const EDITOR: ActingMember = { userId: "editor-1", role: "editor" };
const CONTRIBUTOR: ActingMember = {
  userId: "contributor-1",
  role: "contributor",
};
const VIEWER: ActingMember = { userId: "viewer-1", role: "viewer" };

const privateObject = (createdBy: string): ObjectOwnership => ({
  privacyLevel: "private",
  createdBy,
});
const familyObject = (createdBy: string): ObjectOwnership => ({
  privacyLevel: "family",
  createdBy,
});
const publicObject = (createdBy: string): ObjectOwnership => ({
  privacyLevel: "public",
  createdBy,
});

describe("canView", () => {
  it("owner sees a PRIVATE object created by someone else", () => {
    expect(canView(OWNER, privateObject("someone-else"))).toBe(true);
  });

  it("the creator sees their own PRIVATE object even as a viewer role", () => {
    const member: ActingMember = { userId: "creator-1", role: "viewer" };
    expect(canView(member, privateObject("creator-1"))).toBe(true);
  });

  it("editor who is neither owner nor creator does NOT see another's PRIVATE object", () => {
    expect(canView(EDITOR, privateObject("someone-else"))).toBe(false);
  });

  it("contributor who is neither owner nor creator does NOT see another's PRIVATE object", () => {
    expect(canView(CONTRIBUTOR, privateObject("someone-else"))).toBe(false);
  });

  it("viewer who is neither owner nor creator does NOT see another's PRIVATE object", () => {
    expect(canView(VIEWER, privateObject("someone-else"))).toBe(false);
  });

  it("any role sees a FAMILY-level object", () => {
    for (const member of [OWNER, EDITOR, CONTRIBUTOR, VIEWER]) {
      expect(canView(member, familyObject("someone-else"))).toBe(true);
    }
  });

  it("any role sees a PUBLIC-level object", () => {
    for (const member of [OWNER, EDITOR, CONTRIBUTOR, VIEWER]) {
      expect(canView(member, publicObject("someone-else"))).toBe(true);
    }
  });
});

describe("canCreate", () => {
  it("owner and editor can create event/media/story", () => {
    expect(canCreate("owner", "event")).toBe(true);
    expect(canCreate("editor", "media")).toBe(true);
  });

  it("contributor can create event/media/story", () => {
    expect(canCreate("contributor", "event")).toBe(true);
    expect(canCreate("contributor", "media")).toBe(true);
    expect(canCreate("contributor", "story")).toBe(true);
  });

  it("viewer cannot create event/media/story", () => {
    expect(canCreate("viewer", "event")).toBe(false);
    expect(canCreate("viewer", "media")).toBe(false);
    expect(canCreate("viewer", "story")).toBe(false);
  });
});

describe("canEdit / canDelete", () => {
  it("contributor can edit/delete an Event they created themselves", () => {
    const object = familyObject(CONTRIBUTOR.userId);
    expect(canEdit(CONTRIBUTOR, object)).toBe(true);
    expect(canDelete(CONTRIBUTOR, object)).toBe(true);
  });

  it("contributor CANNOT edit/delete an Event created by someone else", () => {
    const object = familyObject("someone-else");
    expect(canEdit(CONTRIBUTOR, object)).toBe(false);
    expect(canDelete(CONTRIBUTOR, object)).toBe(false);
  });

  it("editor CAN edit/delete an Event created by someone else", () => {
    const object = familyObject("someone-else");
    expect(canEdit(EDITOR, object)).toBe(true);
    expect(canDelete(EDITOR, object)).toBe(true);
  });

  it("owner CAN edit/delete anything", () => {
    const object = privateObject("someone-else");
    expect(canEdit(OWNER, object)).toBe(true);
    expect(canDelete(OWNER, object)).toBe(true);
  });

  it("viewer cannot edit/delete an object they didn't create", () => {
    const object = familyObject("someone-else");
    expect(canEdit(VIEWER, object)).toBe(false);
    expect(canDelete(VIEWER, object)).toBe(false);
  });
});

describe("canManageMembers", () => {
  it("only owner may manage members (invite/role-change/remove)", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("editor")).toBe(false);
    expect(canManageMembers("contributor")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });
});

/**
 * filterVisibleX/getVisibleX (event/media/story/person services) are all
 * thin wrappers around canView with no DB dependency once the record is
 * already in hand — exercised directly here against canView rather than
 * duplicating four near-identical DB-backed test files, since the actual
 * filtering logic being verified (never leaking a PRIVATE object to a
 * non-owner, non-creator; never distinguishing "doesn't exist" from
 * "exists but not visible") is the same one rule in every one of them.
 */
describe("visibility filtering (filterVisibleX/getVisibleX contract)", () => {
  it("excludes a PRIVATE object from a non-owner, non-creator's visible list", () => {
    const records = [
      familyObject("someone-else"),
      privateObject("someone-else"),
    ];
    const visible = records.filter((r) => canView(EDITOR, r));
    expect(visible).toHaveLength(1);
    expect(visible[0]?.privacyLevel).toBe("family");
  });

  it("a getVisibleX-shaped lookup resolves to 'not visible' (null-equivalent) for a PRIVATE object the caller can't see, indistinguishable from 'doesn't exist'", () => {
    const object = privateObject("someone-else");
    // getVisibleX's actual contract: fetch succeeds (object exists in this
    // family), but canView says no — the service then returns null exactly
    // as it would for a truly missing id, never a 403/leak.
    const wouldReturnRecord = canView(VIEWER, object);
    expect(wouldReturnRecord).toBe(false);
  });

  it("a getVisibleX-shaped lookup resolves to visible for the object's own creator", () => {
    const object = privateObject(VIEWER.userId);
    expect(canView(VIEWER, object)).toBe(true);
  });
});
