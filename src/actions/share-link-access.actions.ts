"use server";

import { cookies } from "next/headers";
import {
  verifyShareLinkPassword,
  buildShareAccessCookieValue,
  findShareLinkByTokenHashForCookie,
} from "@/domain/share-link/share-link.service";
import { verifyShareLinkPasswordSchema } from "@/lib/validation/share-link";

/**
 * The ONE server action file reachable by an anonymous, unauthenticated
 * visitor — deliberately has NO auth() import anywhere, a structural signal
 * that it is the sole exception to "every action requires auth() +
 * requireFamilyAccess". Reads ONLY `token` and `password` from the client —
 * never familyId/scopeType/permission/scopeId, all of which are always
 * derived server-side from the resolved ShareLinkRecord, never trusted from
 * the request. Writes zero application data — the only side effect is
 * setting a cookie that itself grants no table access, only a shortcut past
 * re-entering the password on the next page load (see
 * share-link.service.ts::resolveShareLinkAccess, which re-validates
 * status/expiry from the DB on every single request regardless of the
 * cookie's presence).
 */

export interface VerifyShareLinkPasswordFormState {
  ok?: true;
  error?: string;
}

export async function verifyShareLinkPasswordAction(
  _prevState: VerifyShareLinkPasswordFormState,
  formData: FormData,
): Promise<VerifyShareLinkPasswordFormState> {
  const parsed = verifyShareLinkPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Введите пароль." };
  }

  const result = await verifyShareLinkPassword(
    parsed.data.token,
    parsed.data.password,
  );
  if (!result.ok) {
    // Deliberately the same generic message regardless of the underlying
    // reason (wrong password vs. not-found/expired/revoked) — those other
    // states are surfaced by the page itself on next render, not by this
    // action's error text, so this message only ever needs to cover the
    // password-mismatch case in practice.
    return { error: "Неверный пароль." };
  }

  const link = await findShareLinkByTokenHashForCookie(parsed.data.token);
  if (!link) return { error: "Неверный пароль." };

  const cookieStore = await cookies();
  const maxAgeSeconds = link.expiresAt
    ? Math.max(0, Math.floor((link.expiresAt.getTime() - Date.now()) / 1000))
    : 60 * 60 * 24; // 24h fallback for never-expiring links

  cookieStore.set("share_access", buildShareAccessCookieValue(link), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/share/${parsed.data.token}`,
    maxAge: maxAgeSeconds,
  });

  return { ok: true };
}
