"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { writeLocaleCookie } from "@/i18n/sync-locale";

/**
 * Switches the UI language. Not family-scoped (no requireFamilyAccess): it
 * only touches the caller's own cookie and, when signed in, their own
 * `users` row. The value is validated server-side, never trusted as-is.
 */
export async function setLocaleAction(locale: unknown): Promise<void> {
  if (!isLocale(locale)) return;

  await writeLocaleCookie(locale);

  const session = await auth();
  if (session?.user?.id) {
    await db.update(users).set({ locale }).where(eq(users.id, session.user.id));
  }
}
