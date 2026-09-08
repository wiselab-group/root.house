import type { FamilyRole } from "./roles";
import type { PrivacyLevel } from "@/db/schema";

/**
 * Capability layer on top of requireFamilyAccess/roleSatisfies — see that
 * module's doc comment. roleSatisfies alone is only correct for simple
 * "at least X" gates; these functions cover the object-level nuances the
 * spec calls for: PRIVATE visibility restricted to owner+creator, and
 * CONTRIBUTOR's "create yes, edit/delete someone else's — no" shape.
 *
 * Pure, dependency-free (no next/react/db imports) so every rule here is
 * trivially unit-testable with plain objects — see permissions.test.ts.
 */

/** Entities where CONTRIBUTOR may create, but only edit/delete their own —
 *  Person and Relationship are deliberately NOT here: contributor has zero
 *  access to those beyond ordinary viewer reads (stays editor-and-up via
 *  requireFamilyAccess's plain minRole gate, no capability check needed). */
export type ContributableEntity = "event" | "media" | "story";

export interface ObjectOwnership {
  privacyLevel: PrivacyLevel;
  /** The user id who created/uploaded/authored this object — field name
   *  varies per table (createdBy/uploadedBy/authorId); callers normalize to
   *  this one property before calling canView/canEdit/canDelete. */
  createdBy: string;
}

export interface ActingMember {
  userId: string;
  role: FamilyRole;
}

/**
 * Read-visibility rule: a PRIVATE object is visible only to the family's
 * owner(s) and the object's own creator, regardless of the creator's current
 * role. FAMILY and PUBLIC objects are visible to any member (viewer and up).
 */
export function canView(
  member: ActingMember,
  object: ObjectOwnership,
): boolean {
  if (object.privacyLevel !== "private") return true;
  return member.role === "owner" || member.userId === object.createdBy;
}

/**
 * Create permission for CONTRIBUTOR-eligible entity types. Editor/owner can
 * always create; contributor may create event/media/story only (never
 * person/relationship — those remain editor-and-up via the ordinary minRole
 * gate, this function is never consulted for them). `entity` isn't branched
 * on today (every ContributableEntity has the same rule) — kept as a
 * parameter so call sites read as intent (`canCreate(role, "event")`) and
 * so a future entity needing a different rule doesn't have to change every
 * call site's shape, only this function's body.
 */
export function canCreate(
  role: FamilyRole,
  entity: ContributableEntity,
): boolean {
  void entity;
  if (role === "owner" || role === "editor") return true;
  if (role === "contributor") return true; // contributor may create event/media/story
  return false;
}

/**
 * Edit permission for CONTRIBUTOR-eligible entity types: owner/editor may
 * edit ANY visible object; anyone else (typically a contributor) may edit an
 * object only if THEY created it — "creator-owns-it" regardless of their
 * current role (covers a member later demoted to viewer keeping edit rights
 * on their own past contributor-era creations).
 */
export function canEdit(
  member: ActingMember,
  object: ObjectOwnership,
): boolean {
  if (member.role === "owner" || member.role === "editor") return true;
  return member.userId === object.createdBy;
}

/** Delete follows the identical rule to edit — see canEdit's doc comment. */
export function canDelete(
  member: ActingMember,
  object: ObjectOwnership,
): boolean {
  return canEdit(member, object);
}

/** Only an owner may invite/resend/revoke invitations, change another
 *  member's role, or remove a member. */
export function canManageMembers(role: FamilyRole): boolean {
  return role === "owner";
}

/** Changing an object's privacy level follows the same rule as editing it —
 *  kept as a distinct named export so call sites read as intent ("may this
 *  member change privacy") rather than a bare canEdit() call. */
export const canManagePrivacy = canEdit;
