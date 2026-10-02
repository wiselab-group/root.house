"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { isAdminEmail } from "@/domain/admin/admin-access";
import { deleteUserAccount } from "@/domain/admin/account-deletion.service";
import { getUserEmail } from "@/domain/auth/auth.service";

export type DeleteAccountResult =
  | { ok: true; deletedFamilies: number; deletedFiles: number }
  | { ok: false; error: "notFound" | "emailMismatch" | "protected" | "failed" };

/**
 * Deletes a user account from /admin — for "please delete my account"
 * requests (/privacy promises 30 days). Not family-scoped, so the usual
 * requireFamilyAccess() doesn't apply; requireAdmin() (auth() + allowlist)
 * is the gate, checked before anything is read.
 *
 * `confirmEmail` is what the admin typed into the dialog: re-checked here
 * against the account's real email, so a stale row or a mis-click can't
 * delete the wrong person. Admin accounts (including your own) can't be
 * deleted from here at all.
 */
export async function deleteAccountAction(
  userId: string,
  confirmEmail: string,
): Promise<DeleteAccountResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(userId).success) {
    return { ok: false, error: "notFound" };
  }

  const email = await getUserEmail(userId);
  if (!email) return { ok: false, error: "notFound" };
  if (isAdminEmail(email)) return { ok: false, error: "protected" };
  if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "emailMismatch" };
  }

  try {
    const result = await deleteUserAccount(userId);
    revalidatePath("/admin");
    return { ok: true, ...result };
  } catch {
    return { ok: false, error: "failed" };
  }
}
