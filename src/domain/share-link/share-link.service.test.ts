import { describe, expect, it } from "vitest";
import {
  shareLinkStatus,
  resolveExpiresAt,
  type ExpirationPreset,
} from "./share-link.service";
import type { ShareLinkRecord } from "./share-link.repository";

/**
 * shareLinkStatus/resolveExpiresAt are the only pure, DB-free pieces of the
 * share-link domain — the rest (createShareLink/revokeShareLink/
 * verifyShareLinkPassword/resolveShareLinkAccess) is DB-coupled
 * (share-link.repository.ts has no injectable Db, unlike
 * family.repository.ts::FamilyDb) and is deliberately NOT unit-tested here.
 *
 * KNOWN GAP — mirrors invitation.test.ts's own documented gap. These
 * scenarios require an integration/manual pass rather than a unit test
 * until/unless share-link.repository.ts gains the same fake-Db injection
 * pattern as family.repository.ts:
 *   - createShareLink rejects a focusPersonId not visible under its own visibilityScope
 *   - verifyShareLinkPassword: wrong password / no password set / expired / revoked
 *   - resolveShareLinkAccess: not_found / expired / revoked / password_required / granted
 *   - the HMAC cookie proof rejects a proof minted for a different link
 * See the implementation plan's manual smoke-test checklist for these.
 */
function baseLink(overrides: Partial<ShareLinkRecord> = {}): ShareLinkRecord {
  return {
    id: "link-1",
    familyId: "family-1",
    tokenHash: "hash",
    scopeType: "FAMILY",
    scopeId: null,
    focusPersonId: "person-1",
    permission: "VIEW_ONLY",
    visibilityScope: "family_and_public",
    passwordHash: null,
    expiresAt: null,
    revokedAt: null,
    createdBy: "owner-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("shareLinkStatus", () => {
  it("active: no revokedAt, no expiresAt", () => {
    expect(shareLinkStatus(baseLink())).toBe("active");
  });

  it("active: expiresAt set in the future", () => {
    expect(
      shareLinkStatus(
        baseLink({ expiresAt: new Date(Date.now() + 1000 * 60 * 60) }),
      ),
    ).toBe("active");
  });

  it("expired: expiresAt in the past, not revoked", () => {
    expect(
      shareLinkStatus(baseLink({ expiresAt: new Date(Date.now() - 1000) })),
    ).toBe("expired");
  });

  it("revoked: revokedAt set, expiresAt still in the future", () => {
    expect(
      shareLinkStatus(
        baseLink({
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        }),
      ),
    ).toBe("revoked");
  });

  it("revoked wins precedence even when also expired — a deliberate revoke always reads as revoked", () => {
    expect(
      shareLinkStatus(
        baseLink({
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000),
        }),
      ),
    ).toBe("revoked");
  });
});

describe("resolveExpiresAt", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("never -> null", () => {
    expect(resolveExpiresAt("never")).toBeNull();
  });

  it("7d -> ~7 days from now", () => {
    const result = resolveExpiresAt("7d");
    expect(result).not.toBeNull();
    const deltaMs = result!.getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(7 * DAY_MS - 5000);
    expect(deltaMs).toBeLessThanOrEqual(7 * DAY_MS);
  });

  it("30d -> ~30 days from now", () => {
    const result = resolveExpiresAt("30d");
    expect(result).not.toBeNull();
    const deltaMs = result!.getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(30 * DAY_MS - 5000);
    expect(deltaMs).toBeLessThanOrEqual(30 * DAY_MS);
  });

  it("covers every ExpirationPreset value", () => {
    const presets: ExpirationPreset[] = ["never", "7d", "30d"];
    for (const preset of presets) {
      expect(() => resolveExpiresAt(preset)).not.toThrow();
    }
  });
});
