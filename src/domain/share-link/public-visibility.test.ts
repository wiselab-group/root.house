import { describe, expect, it } from "vitest";
import { canViewViaShareLink } from "./public-visibility";
import { canView, type ActingMember } from "@/domain/family/permissions";

describe("canViewViaShareLink", () => {
  describe("scope: public_only", () => {
    it("public object -> visible", () => {
      expect(
        canViewViaShareLink({ privacyLevel: "public" }, "public_only"),
      ).toBe(true);
    });

    it("family-level object -> NOT visible", () => {
      expect(
        canViewViaShareLink({ privacyLevel: "family" }, "public_only"),
      ).toBe(false);
    });

    it("private object -> NOT visible", () => {
      expect(
        canViewViaShareLink({ privacyLevel: "private" }, "public_only"),
      ).toBe(false);
    });
  });

  describe("scope: family_and_public", () => {
    it("public object -> visible", () => {
      expect(
        canViewViaShareLink({ privacyLevel: "public" }, "family_and_public"),
      ).toBe(true);
    });

    it("family-level object -> visible", () => {
      expect(
        canViewViaShareLink({ privacyLevel: "family" }, "family_and_public"),
      ).toBe(true);
    });

    it("private object -> NOT visible even in the wider scope", () => {
      expect(
        canViewViaShareLink({ privacyLevel: "private" }, "family_and_public"),
      ).toBe(false);
    });
  });

  // Regression guard: canView (for authenticated members) treats "family"
  // and "public" identically — canViewViaShareLink must NOT be reused/
  // conflated with it, or an anonymous visitor would see family-only
  // content regardless of the link's own chosen scope. This test locks in
  // that under the narrower "public_only" scope the two predicates
  // deliberately diverge on privacyLevel="family"; "private" must never be
  // shown by either scope value.
  it("public_only scope diverges from canView on privacyLevel='family' — a narrowly-scoped link shows strictly less than an authenticated viewer", () => {
    const VIEWER: ActingMember = { userId: "viewer-1", role: "viewer" };
    const familyObject = {
      privacyLevel: "family" as const,
      createdBy: "someone",
    };

    expect(canView(VIEWER, familyObject)).toBe(true);
    expect(canViewViaShareLink(familyObject, "public_only")).toBe(false);
  });

  it("private is never shown by either scope, even though canView would show it to the object's own creator", () => {
    const privateObject = {
      privacyLevel: "private" as const,
      createdBy: "creator-1",
    };
    expect(canViewViaShareLink(privateObject, "public_only")).toBe(false);
    expect(canViewViaShareLink(privateObject, "family_and_public")).toBe(false);
  });
});
