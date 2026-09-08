export type FamilyRole = "owner" | "editor" | "contributor" | "viewer";

/**
 * Ordering used to decide whether a member's role satisfies a required
 * minimum. Correct for simple "at least X" gates (owner-only, editor-and-up,
 * viewer-and-up) — but does NOT capture CONTRIBUTOR's non-monotonic shape
 * (create event/media/story: yes; edit/delete someone ELSE's: no, even
 * though an editor above them can). Those cases must layer the capability
 * checks in domain/family/permissions.ts on top of roleSatisfies, not rely
 * on this rank alone.
 */
const ROLE_RANK: Record<FamilyRole, number> = {
  viewer: 0,
  contributor: 1,
  editor: 2,
  owner: 3,
};

/** true if `role` grants at least the privileges of `minRole`. */
export function roleSatisfies(role: FamilyRole, minRole: FamilyRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
