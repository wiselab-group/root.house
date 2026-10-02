/**
 * Who may open /admin. An email allowlist rather than a role column: the
 * service team is one or two people, and a hardcoded list can't be granted
 * by a bug in some write path. Safe only because these accounts already
 * exist — `users.email` is unique, so nobody can register the address
 * first and inherit admin.
 */
const ADMIN_EMAILS: readonly string[] = ["thekupczyk@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
