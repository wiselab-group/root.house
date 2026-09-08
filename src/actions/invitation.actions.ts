"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getFamilySlugById,
  getFamilySummary,
} from "@/domain/family/family.service";
import { inviteMemberSchema } from "@/lib/validation/invitation";
import {
  acceptInvitation,
  createInvitation,
  InvitationInvalidError,
  resendInvitation,
  revokeInvitation,
} from "@/domain/invitation/invitation.service";

export interface InviteMemberFormState {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "role", string>>;
  inviteUrl?: string;
}

/**
 * Invites a new member by email — owner-only (see spec §11/§13: only OWNER
 * manages Family Settings → Members → Invite member). Always returns the
 * plaintext invite URL on success so the Members UI can show a copyable
 * link regardless of whether the email actually sent (see
 * src/lib/email/send-invitation.ts's best-effort contract).
 */
export async function inviteFamilyMemberAction(
  familyId: string,
  _prevState: InviteMemberFormState,
  formData: FormData,
): Promise<InviteMemberFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "owner");

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const fieldErrors: InviteMemberFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "role") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const family = await getFamilySummary(familyId);
  if (!family) return { error: "Семья не найдена." };

  try {
    const { inviteUrl } = await createInvitation({
      familyId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: session.user.id,
      familyName: family.name,
    });

    const slug = await getFamilySlugById(familyId);
    if (slug) revalidatePath(`/families/${slug}/settings`);
    return { inviteUrl };
  } catch (error) {
    if (error instanceof InvitationInvalidError) {
      return { fieldErrors: { email: error.message } };
    }
    throw error;
  }
}

export interface ResendInvitationFormState {
  error?: string;
  inviteUrl?: string;
}

export async function resendInvitationAction(
  familyId: string,
  invitationId: string,
): Promise<ResendInvitationFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "owner");

  const family = await getFamilySummary(familyId);
  if (!family) return { error: "Семья не найдена." };

  const { inviteUrl } = await resendInvitation(
    invitationId,
    familyId,
    session.user.id,
    family.name,
  );

  const slug = await getFamilySlugById(familyId);
  if (slug) revalidatePath(`/families/${slug}/settings`);
  return { inviteUrl };
}

export async function revokeInvitationAction(
  familyId: string,
  invitationId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "owner");
  await revokeInvitation(invitationId, familyId);

  const slug = await getFamilySlugById(familyId);
  if (slug) revalidatePath(`/families/${slug}/settings`);
}

export interface AcceptInvitationFormState {
  error?: string;
}

/**
 * Accepts the invitation identified by `token` for the currently logged-in
 * user. Requires only auth() — no requireFamilyAccess call, since the whole
 * point is the user isn't a member yet; the token itself is the credential.
 *
 * Redirects server-side (next/navigation's redirect(), same pattern as
 * createFamilyAction/deleteFamilyAction) rather than returning a
 * `redirectTo` string for the client to router.push() itself — a returned
 * state update from a Server Action triggers Next.js to re-render the
 * enclosing page's Server Component tree as part of committing the action,
 * and /invite/[token]'s own render reads the invitation's (now "accepted")
 * status on that very re-render; a client-side useEffect racing to redirect
 * loses to that server re-render, which swaps AcceptInvitationCard out for
 * the generic "already accepted" branch before the effect can fire. A
 * server-side redirect() has no such race — it throws and Next.js commits
 * the redirect directly, without a state round-trip through the client.
 */
export async function acceptInvitationAction(
  token: string,
): Promise<AcceptInvitationFormState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Сессия истекла — войдите заново." };
  }

  const result = await acceptInvitation(
    token,
    session.user.id,
    session.user.email,
  );

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "Приглашение не найдено или уже использовано.",
      expired: "Срок действия приглашения истёк.",
      revoked: "Это приглашение было отозвано.",
      wrong_email: "Это приглашение отправлено на другой email.",
    };
    return { error: messages[result.reason] };
  }

  revalidatePath(`/families/${result.familySlug}`);
  redirect(`/families/${result.familySlug}`);
}
