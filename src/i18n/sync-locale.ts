import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "./config";

export async function writeLocaleCookie(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

/**
 * Runs at sign-in (Auth.js `events.signIn`). A saved `users.locale` wins and
 * is copied into the cookie, so the language follows the account to a new
 * device; a user with no saved choice adopts whatever this browser already
 * picked explicitly. Best effort — a failure here must never block sign-in.
 */
export async function syncLocaleOnSignIn(userId: string): Promise<void> {
  try {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { locale: true },
    });
    if (row?.locale) {
      await writeLocaleCookie(row.locale);
      return;
    }
    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(cookieLocale)) {
      await db
        .update(users)
        .set({ locale: cookieLocale })
        .where(eq(users.id, userId));
    }
  } catch {
    // Cookies may be read-only in this context, or the DB unreachable —
    // the user simply keeps the browser-negotiated language.
  }
}
