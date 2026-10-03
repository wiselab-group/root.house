"use server";

import { auth } from "@/lib/auth";
import { isMapThemeId } from "@/domain/shared/map-theme";
import { setUserMapTheme } from "@/domain/auth/auth.service";

/**
 * Saves the family map's look for the caller. Not family-scoped (no
 * requireFamilyAccess), like setLocaleAction: it only touches the caller's
 * own `users` row. The value is validated server-side, never trusted.
 */
export async function setMapThemeAction(theme: unknown): Promise<void> {
  if (!isMapThemeId(theme)) return;
  const session = await auth();
  if (!session?.user?.id) return;
  await setUserMapTheme(session.user.id, theme);
}
