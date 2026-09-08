import { describe, expect, it } from "vitest";
import { invitationStatus } from "./invitation.service";
import type { InvitationRecord } from "./invitation.repository";

/**
 * invitationStatus is the only pure, DB-free piece of the invitation domain
 * — the rest (createInvitation/acceptInvitation/resendInvitation) is
 * DB-coupled (invitation.repository.ts has no injectable Db, unlike
 * family.repository.ts::FamilyDb) and is deliberately NOT unit-tested here.
 *
 * KNOWN GAP — these scenarios (mapped to spec §21) require an integration/
 * manual pass rather than a unit test until/unless invitation.repository.ts
 * gains the same fake-Db injection pattern as family.repository.ts:
 *   - expired invitation cannot be accepted (acceptInvitation → expired)
 *   - revoked invitation cannot be accepted (acceptInvitation → revoked)
 *   - already-accepted invitation, same user re-clicking → idempotent success
 *   - already-accepted invitation, different user hitting the same URL → denied
 *   - invitation email mismatch → denied (wrong_email)
 *   - duplicate invite to an existing member → rejected at creation time
 *     (createInvitation → InvitationInvalidError)
 * See CLAUDE.md-mandated verification section of the implementation plan for
 * the manual smoke-test checklist covering these.
 */
function baseInvitation(
  overrides: Partial<InvitationRecord> = {},
): InvitationRecord {
  return {
    id: "inv-1",
    familyId: "family-1",
    email: "person@example.com",
    role: "viewer",
    tokenHash: "hash",
    invitedBy: "owner-1",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("invitationStatus", () => {
  it("pending: no timestamps set, not expired", () => {
    expect(invitationStatus(baseInvitation())).toBe("pending");
  });

  it("accepted: acceptedAt set", () => {
    expect(invitationStatus(baseInvitation({ acceptedAt: new Date() }))).toBe(
      "accepted",
    );
  });

  it("accepted wins precedence even if also revoked", () => {
    expect(
      invitationStatus(
        baseInvitation({ acceptedAt: new Date(), revokedAt: new Date() }),
      ),
    ).toBe("accepted");
  });

  it("accepted wins precedence even if also expired", () => {
    expect(
      invitationStatus(
        baseInvitation({
          acceptedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000),
        }),
      ),
    ).toBe("accepted");
  });

  it("revoked: revokedAt set, not accepted", () => {
    expect(invitationStatus(baseInvitation({ revokedAt: new Date() }))).toBe(
      "revoked",
    );
  });

  it("expired: expiresAt in the past, neither accepted nor revoked", () => {
    expect(
      invitationStatus(
        baseInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      ),
    ).toBe("expired");
  });
});
