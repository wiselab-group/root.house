import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/domain/admin/admin-access";

/**
 * Gate for everything under /admin — call first in every admin page and
 * action, before any query. Non-admins get a plain 404, not 403: the page
 * shouldn't even confirm it exists.
 *
 * Checks the session's email against the allowlist on every request; the
 * header's admin icon (isAdmin prop) is only UX and never trusted.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email)) notFound();
  return { userId: session.user.id };
}
