export type FamilyRole = "owner" | "editor" | "viewer";

/** Ordering used to decide whether a member's role satisfies a required minimum. */
const ROLE_RANK: Record<FamilyRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

/** true if `role` grants at least the privileges of `minRole`. */
export function roleSatisfies(role: FamilyRole, minRole: FamilyRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
