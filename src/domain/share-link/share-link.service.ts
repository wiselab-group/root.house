import { hash, compare } from "bcrypt-ts";
import crypto from "node:crypto";
import { generateToken, hashToken } from "@/domain/shared/token";
import { getPersonById } from "@/domain/person/person.repository";
import {
  insertShareLink,
  findShareLinkByTokenHash,
  listShareLinksForFamily,
  markRevoked,
  type ShareLinkRecord,
} from "./share-link.repository";
import {
  canViewViaShareLink,
  type ShareLinkVisibilityScope,
} from "./public-visibility";

export type { ShareLinkVisibilityScope };

export type { ShareLinkRecord };

// Same bcrypt cost factor as domain/auth/auth.service.ts — one answer to
// "what's our bcrypt cost factor" across the codebase, not two.
const BCRYPT_SALT_ROUNDS = 12;

export class ShareLinkInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareLinkInvalidError";
  }
}

/**
 * Same base-URL precedence as invitation.service.ts::buildInviteUrl — see
 * that function's doc comment for the AUTH_URL/NEXTAUTH_URL/VERCEL_URL/
 * localhost fallback chain rationale.
 */
function buildShareUrl(token: string): string {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined) ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/share/${token}`;
}

export type ExpirationPreset = "never" | "7d" | "30d";

/** Pure — isolated so a future "custom" preset is one new case, not a
 *  rewrite of every call site. */
export function resolveExpiresAt(preset: ExpirationPreset): Date | null {
  const DAY_MS = 24 * 60 * 60 * 1000;
  switch (preset) {
    case "never":
      return null;
    case "7d":
      return new Date(Date.now() + 7 * DAY_MS);
    case "30d":
      return new Date(Date.now() + 30 * DAY_MS);
  }
}

export type ShareLinkStatus = "active" | "expired" | "revoked";

/**
 * Pure, derived from timestamps — mirrors invitationStatus. Precedence is
 * revoked > expired > active: there's no "accepted" state here (unlike
 * invitations), so a deliberate revoke should always read as revoked
 * regardless of what expiresAt says.
 */
export function shareLinkStatus(link: ShareLinkRecord): ShareLinkStatus {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return "expired";
  return "active";
}

export interface CreateShareLinkInput {
  familyId: string;
  createdBy: string;
  focusPersonId: string;
  visibilityScope: ShareLinkVisibilityScope;
  expirationPreset: ExpirationPreset;
  password?: string;
}

/**
 * Creates a Share Link — always scopeType "FAMILY" / permission "VIEW_ONLY"
 * in this MVP (both left at their table defaults). Validates focusPersonId
 * up front: must exist in this family AND already be visible under the
 * link's OWN chosen visibilityScope — a link can never be created anchored
 * at a person who wouldn't even show up in its own tree, since the
 * anonymous tree view (public-tree.service.ts) would then have no valid
 * focus to build the layout from.
 */
export async function createShareLink(
  input: CreateShareLinkInput,
): Promise<{ shareLink: ShareLinkRecord; shareUrl: string }> {
  const focusPerson = await getPersonById(input.focusPersonId, input.familyId);
  if (!focusPerson) {
    throw new ShareLinkInvalidError("Выбранный человек не найден.");
  }
  if (!canViewViaShareLink(focusPerson, input.visibilityScope)) {
    throw new ShareLinkInvalidError(
      "Фокус-персона ссылки должна быть видна в выбранном режиме доступа.",
    );
  }

  const { token, tokenHash } = generateToken();
  const passwordHash = input.password
    ? await hash(input.password, BCRYPT_SALT_ROUNDS)
    : null;

  const shareLink = await insertShareLink({
    familyId: input.familyId,
    tokenHash,
    focusPersonId: input.focusPersonId,
    visibilityScope: input.visibilityScope,
    passwordHash,
    expiresAt: resolveExpiresAt(input.expirationPreset),
    createdBy: input.createdBy,
  });

  return { shareLink, shareUrl: buildShareUrl(token) };
}

export interface ShareLinkWithStatus extends ShareLinkRecord {
  status: ShareLinkStatus;
}

export async function listShareLinksForFamilyWithStatus(
  familyId: string,
): Promise<ShareLinkWithStatus[]> {
  const links = await listShareLinksForFamily(familyId);
  return links.map((link) => ({ ...link, status: shareLinkStatus(link) }));
}

export async function revokeShareLink(
  id: string,
  familyId: string,
): Promise<void> {
  await markRevoked(id, familyId);
}

export type VerifyPasswordResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "expired"
        | "revoked"
        | "no_password_set"
        | "wrong_password";
    };

export async function verifyShareLinkPassword(
  token: string,
  password: string,
): Promise<VerifyPasswordResult> {
  const link = await findShareLinkByTokenHash(hashToken(token));
  if (!link) return { ok: false, reason: "not_found" };

  const status = shareLinkStatus(link);
  if (status === "revoked") return { ok: false, reason: "revoked" };
  if (status === "expired") return { ok: false, reason: "expired" };

  if (!link.passwordHash) return { ok: false, reason: "no_password_set" };

  const matches = await compare(password, link.passwordHash);
  if (!matches) return { ok: false, reason: "wrong_password" };

  return { ok: true };
}

/**
 * HMAC binding the password-proof cookie to THIS link's own tokenHash — see
 * app/share/[token]/page.tsx for how the cookie is written/read. A cookie
 * obtained by unlocking link A can never validate against link B, because
 * the HMAC is keyed to A's tokenHash and won't match B's. Reuses AUTH_SECRET
 * (already provisioned for Auth.js) rather than a new secret.
 */
function computeCookieProof(link: ShareLinkRecord): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return crypto
    .createHmac("sha256", secret)
    .update(link.tokenHash)
    .digest("hex");
}

export function buildShareAccessCookieValue(link: ShareLinkRecord): string {
  return `${link.id}.${computeCookieProof(link)}`;
}

/**
 * Re-resolves a link by its plaintext token — used right after a successful
 * password verification to build the cookie's proof value. Kept separate
 * from verifyShareLinkPassword (which already looked the link up) rather
 * than having that function also return the record, so its own return type
 * stays a clean ok/reason discriminant with no unrelated data attached.
 */
export async function findShareLinkByTokenHashForCookie(
  token: string,
): Promise<ShareLinkRecord | null> {
  return findShareLinkByTokenHash(hashToken(token));
}

function verifyShareAccessCookie(
  link: ShareLinkRecord,
  cookieValue: string | null,
): boolean {
  if (!cookieValue) return false;
  const [linkId, proof] = cookieValue.split(".");
  if (!linkId || !proof || linkId !== link.id) return false;
  const expected = computeCookieProof(link);
  // Constant-time compare — cookie proof is a credential-adjacent value.
  const a = Buffer.from(proof);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type ShareLinkAccessResult =
  | { kind: "not_found" }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "password_required" }
  | { kind: "granted"; link: ShareLinkRecord };

/**
 * The anonymous entry point — called from app/share/[token]/page.tsx on
 * every request. Re-derives everything fresh from the token; never trusts
 * anything except the token itself and (for password-protected links) a
 * cookie whose proof is cryptographically bound to this exact link.
 */
export async function resolveShareLinkAccess(
  token: string,
  cookieValue: string | null,
): Promise<ShareLinkAccessResult> {
  const link = await findShareLinkByTokenHash(hashToken(token));
  if (!link) return { kind: "not_found" };

  const status = shareLinkStatus(link);
  if (status === "revoked") return { kind: "revoked" };
  if (status === "expired") return { kind: "expired" };

  if (link.passwordHash) {
    const proven = verifyShareAccessCookie(link, cookieValue);
    if (!proven) return { kind: "password_required" };
  }

  return { kind: "granted", link };
}
