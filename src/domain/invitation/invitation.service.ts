import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { familyMembers, families, users } from "@/db/schema";
import type { FamilyRole } from "@/domain/family/roles";
import { NotFoundError } from "@/domain/family/errors";
import { getFamilySlugById } from "@/domain/family/family.service";
import {
  findInvitationById,
  findInvitationByTokenHash,
  insertInvitation,
  listPendingInvitations,
  markAccepted,
  markRevoked,
  type InvitationRecord,
} from "./invitation.repository";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import { generateToken, hashToken } from "@/domain/shared/token";

export type { InvitationRecord };

const INVITATION_TTL_DAYS = 7;

export class InvitationInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationInvalidError";
  }
}

/**
 * Same base-URL precedence Auth.js itself effectively needs per environment
 * (see .env.example's AUTH_URL comment): explicit AUTH_URL/NEXTAUTH_URL wins
 * when set (production, e.g. https://root.house); otherwise fall back to
 * Vercel's auto-injected VERCEL_URL (preview deployments, e.g.
 * root-house.vercel.app — no scheme, so it's prefixed with https://); and
 * finally localhost for local dev where neither is set.
 */
function buildInviteUrl(token: string): string {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined) ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export interface CreateInvitationInput {
  familyId: string;
  email: string;
  role: FamilyRole;
  invitedBy: string;
  /** For the email body / preview screen. */
  familyName: string;
}

/**
 * Creates an invitation, rejecting it if the email already belongs to a
 * family member (best-effort — email isn't a unique identifier for a User,
 * see spec §10, so this is advisory rather than a hard DB constraint), then
 * emails the invite link (best-effort, never throws — see
 * sendInvitationEmail). Returns both the DB record and the plaintext invite
 * URL — shown once, in the UI, as the copyable link. The plaintext token is
 * never persisted or logged.
 */
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<{ invitation: InvitationRecord; inviteUrl: string }> {
  const existingMember = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .innerJoin(users, eq(familyMembers.userId, users.id))
    .where(eq(users.email, input.email))
    .limit(1);
  if (existingMember.length > 0) {
    throw new InvitationInvalidError(
      "Этот email уже принадлежит участнику семьи.",
    );
  }

  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const invitation = await insertInvitation({
    familyId: input.familyId,
    email: input.email,
    role: input.role,
    tokenHash,
    invitedBy: input.invitedBy,
    expiresAt,
  });

  const inviteUrl = buildInviteUrl(token);

  // Best-effort — never throws, see sendInvitationEmail's own doc comment.
  await sendInvitationEmail({
    to: input.email,
    familyName: input.familyName,
    inviteUrl,
  });

  return { invitation, inviteUrl };
}

export async function listPendingInvitationsForFamily(
  familyId: string,
): Promise<InvitationRecord[]> {
  return listPendingInvitations(familyId);
}

export async function revokeInvitation(
  invitationId: string,
  familyId: string,
): Promise<void> {
  await markRevoked(invitationId, familyId);
}

/**
 * Resend = revoke the old row + issue a brand-new token/row. Deliberately
 * NOT "update expiresAt on the same row" — that would let a leaked old token
 * (e.g. from an email client's link-preview crawler) keep working past what
 * the user thinks they revoked by resending.
 */
export async function resendInvitation(
  invitationId: string,
  familyId: string,
  invitedBy: string,
  familyName: string,
): Promise<{ invitation: InvitationRecord; inviteUrl: string }> {
  const existing = await findInvitationById(invitationId, familyId);
  if (!existing) throw new NotFoundError("Приглашение не найдено.");

  await markRevoked(invitationId, familyId);

  return createInvitation({
    familyId,
    email: existing.email,
    role: existing.role,
    invitedBy,
    familyName,
  });
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** Pure — status is fully derived from the three timestamp columns.
 *  Precedence: accepted wins even if also revoked/expired (an accepted
 *  invitation's job is done; its later timestamps don't change that). */
export function invitationStatus(
  invitation: InvitationRecord,
): InvitationStatus {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt.getTime() < Date.now()) return "expired";
  return "pending";
}

export interface InvitationPreview {
  familyName: string;
  role: FamilyRole;
  inviterName: string;
  status: InvitationStatus;
}

/** Read-only, no mutation — the pre-accept confirmation screen for a
 *  logged-out (or not-yet-decided) visitor. */
export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const tokenHash = hashToken(token);
  const invitation = await findInvitationByTokenHash(tokenHash);
  if (!invitation) return null;

  const [family, inviter] = await Promise.all([
    db.query.families.findFirst({
      where: eq(families.id, invitation.familyId),
      columns: { name: true },
    }),
    db.query.users.findFirst({
      where: eq(users.id, invitation.invitedBy),
      columns: { name: true },
    }),
  ]);

  return {
    familyName: family?.name ?? "",
    role: invitation.role,
    inviterName: inviter?.name ?? "",
    status: invitationStatus(invitation),
  };
}

export interface AcceptInvitationResult {
  ok: true;
  familyId: string;
  familySlug: string;
  alreadyMember: boolean;
}
export interface AcceptInvitationError {
  ok: false;
  reason: "not_found" | "expired" | "revoked" | "wrong_email";
}

/**
 * Accepts an invitation for the CURRENTLY LOGGED-IN user (userId/userEmail
 * from the session, never trusted from the client). Idempotent: if the user
 * is already a member of this family (e.g. double-click, or they already
 * accepted and hit the link again), returns ok with alreadyMember=true
 * rather than erroring — the (familyId, userId) unique index on
 * family_members would reject a second insert anyway; this checks first to
 * give a clean UX result instead of surfacing a raw constraint violation.
 *
 * Email match: the invitation's `email` must match the logged-in user's own
 * email (case-insensitively) — this stops user A from forwarding user B's
 * invite link and accepting it under their own account; the invite was
 * issued for a specific person.
 */
export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string,
): Promise<AcceptInvitationResult | AcceptInvitationError> {
  const tokenHash = hashToken(token);
  const invitation = await findInvitationByTokenHash(tokenHash);
  if (!invitation) return { ok: false, reason: "not_found" };

  const status = invitationStatus(invitation);

  if (status === "accepted") {
    const existingMembership = await db.query.familyMembers.findFirst({
      where: (t, { and: sqlAnd, eq: sqlEq }) =>
        sqlAnd(sqlEq(t.familyId, invitation.familyId), sqlEq(t.userId, userId)),
    });
    if (existingMembership) {
      const familySlug = (await getFamilySlugById(invitation.familyId)) ?? "";
      return {
        ok: true,
        familyId: invitation.familyId,
        familySlug,
        alreadyMember: true,
      };
    }
    // A different, already-consumed token — deny rather than leak that it
    // ever existed/was valid.
    return { ok: false, reason: "not_found" };
  }

  if (status === "revoked") return { ok: false, reason: "revoked" };
  if (status === "expired") return { ok: false, reason: "expired" };

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, reason: "wrong_email" };
  }

  const existingMembership = await db.query.familyMembers.findFirst({
    where: (t, { and: sqlAnd, eq: sqlEq }) =>
      sqlAnd(sqlEq(t.familyId, invitation.familyId), sqlEq(t.userId, userId)),
  });

  if (!existingMembership) {
    // Single INSERT — atomic on its own, no db.transaction() needed
    // (neon-http has no transaction support; this is one statement, same
    // reasoning as family.service.ts::createFamily).
    await db.insert(familyMembers).values({
      familyId: invitation.familyId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    });
  }

  await markAccepted(invitation.id);

  const familySlug = (await getFamilySlugById(invitation.familyId)) ?? "";

  return {
    ok: true,
    familyId: invitation.familyId,
    familySlug,
    alreadyMember: existingMembership != null,
  };
}
