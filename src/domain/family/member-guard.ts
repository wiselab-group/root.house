import type { FamilyRole } from "./roles";

export interface MemberRoleRow {
  userId: string;
  role: FamilyRole;
}

/**
 * true if changing `targetUserId`'s role away from 'owner' (to `newRole`,
 * or by removal — pass newRole=null) would leave the family with zero
 * owners. A family must always have at least one owner able to manage
 * membership — see family.service.ts::removeFamilyMember and
 * family.repository.ts::updateMemberRole, both of which must refuse this.
 *
 * Pure — takes the full membership list rather than querying itself, so
 * it's trivially unit-testable without a DB (see member-guard.test.ts).
 */
export function isLastOwnerDemotion(
  members: MemberRoleRow[],
  targetUserId: string,
  newRole: FamilyRole | null,
): boolean {
  const target = members.find((m) => m.userId === targetUserId);
  if (!target || target.role !== "owner") return false;
  if (newRole === "owner") return false; // staying/becoming owner never reduces the owner count

  const remainingOwners = members.filter(
    (m) => m.role === "owner" && m.userId !== targetUserId,
  );
  return remainingOwners.length === 0;
}
