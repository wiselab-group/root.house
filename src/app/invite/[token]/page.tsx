import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getInvitationPreview } from "@/domain/invitation/invitation.service";
import { AuthBrand } from "@/components/auth/auth-brand";
import { AcceptInvitationCard } from "@/components/invitation/accept-invitation-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ROLE_LABELS } from "@/domain/family/role-labels";

export const metadata: Metadata = {
  title: "Приглашение в семью",
};

/**
 * Entry point to Family membership — deliberately outside (app)'s layout
 * (which hard-redirects an unauthenticated visitor to /login) since a
 * logged-out invitee must still see WHICH family/role they're being invited
 * to before choosing to log in or register. Accepting itself always
 * requires an explicit confirm click (see AcceptInvitationCard) — never
 * auto-accepted on page load, since it's a state-changing action.
 */
export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [session, preview] = await Promise.all([
    auth(),
    getInvitationPreview(token),
  ]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-4">
      <AuthBrand />
      <Card className="w-full max-w-sm">
        {!preview ? (
          <>
            <CardHeader>
              <CardTitle>Приглашение не найдено</CardTitle>
              <CardDescription>
                Эта ссылка недействительна или уже была использована.
              </CardDescription>
            </CardHeader>
          </>
        ) : preview.status !== "pending" ? (
          <>
            <CardHeader>
              <CardTitle>
                {preview.status === "expired" && "Срок приглашения истёк"}
                {preview.status === "revoked" && "Приглашение отозвано"}
                {preview.status === "accepted" && "Приглашение уже принято"}
              </CardTitle>
              <CardDescription>
                {preview.status === "accepted"
                  ? "Если это были вы — просто войдите в свой аккаунт."
                  : "Попросите владельца семьи отправить приглашение заново."}
              </CardDescription>
            </CardHeader>
            {preview.status === "accepted" && (
              <CardContent>
                <LinkButton href="/login" className="w-full">
                  Войти
                </LinkButton>
              </CardContent>
            )}
          </>
        ) : !session?.user ? (
          <>
            <CardHeader>
              <CardTitle>Приглашение в семью «{preview.familyName}»</CardTitle>
              <CardDescription>
                {preview.inviterName || "Владелец семьи"} приглашает вас
                присоединиться в роли «{ROLE_LABELS[preview.role]}». Войдите или
                зарегистрируйтесь, чтобы принять приглашение.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <LinkButton href={`/login?callbackUrl=/invite/${token}`}>
                Войти
              </LinkButton>
              <LinkButton
                href={`/register?callbackUrl=/invite/${token}`}
                variant="outline"
              >
                Зарегистрироваться
              </LinkButton>
            </CardContent>
          </>
        ) : (
          <AcceptInvitationCard
            token={token}
            familyName={preview.familyName}
            role={preview.role}
            inviterName={preview.inviterName}
          />
        )}
      </Card>
    </main>
  );
}
