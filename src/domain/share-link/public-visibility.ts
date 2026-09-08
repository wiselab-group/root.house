import type { PrivacyLevel } from "@/db/schema";

export type ShareLinkVisibilityScope = "public_only" | "family_and_public";

/**
 * Effective-visibility rule for anonymous Share Link viewers — strictly
 * narrower than domain/family/permissions.ts::canView, which treats
 * "family" and "public" identically for any authenticated family member. A
 * Share Link holder has no membership at all, so "private" is NEVER shown
 * through it regardless of scope — that barrier is not configurable
 * per-link, on purpose.
 *
 * The `scope` parameter is the owner's OWN explicit per-link choice (see
 * db/schema/share-link.ts::shareLinkVisibilityScopeEnum's doc comment for
 * why this exists — requiring every Person to be hand-marked "public"
 * before any link showed anything would be impractical for a family with
 * hundreds of people, virtually all left at the "family" default):
 *   - "public_only": only privacyLevel="public" objects.
 *   - "family_and_public": privacyLevel="family" OR "public" — i.e.
 *     everything an ordinary authenticated viewer role would see.
 *
 * Deliberately kept as its own pure, DB-free predicate rather than reusing/
 * parameterizing canView — reusing canView here would risk a future edit to
 * canView's own logic silently widening what anonymous visitors can see.
 */
export function canViewViaShareLink(
  object: { privacyLevel: PrivacyLevel },
  scope: ShareLinkVisibilityScope,
): boolean {
  if (object.privacyLevel === "private") return false;
  if (scope === "family_and_public") return true;
  return object.privacyLevel === "public";
}
