import { ForbiddenError } from "./errors";
import { roleSatisfies, type FamilyRole } from "./roles";
import {
  findMembership,
  type FamilyDb,
  type FamilyMemberRow,
} from "./family.repository";

/**
 * requireFamilyAccess — the ONE authorization checkpoint for every server
 * action and repository call that touches a Family's data. Every action in
 * src/actions/*.ts MUST call this before reading or writing anything, using
 * the familyId taken from the request, never trusting client-supplied roles.
 *
 * Throws ForbiddenError if the user isn't a member of the family, or is a
 * member whose role doesn't satisfy `minRole`. Never returns null/undefined
 * on failure — callers should let the error propagate (Next.js will render
 * the nearest error boundary), not silently swallow it.
 */
export async function requireFamilyAccess(
  familyId: string,
  userId: string,
  minRole: FamilyRole,
  database?: FamilyDb,
): Promise<FamilyMemberRow> {
  const member = await findMembership(familyId, userId, database);

  if (!member) {
    throw new ForbiddenError("You are not a member of this family.");
  }

  if (!roleSatisfies(member.role, minRole)) {
    throw new ForbiddenError(
      `This action requires the '${minRole}' role or higher; you have '${member.role}'.`,
    );
  }

  return member;
}
