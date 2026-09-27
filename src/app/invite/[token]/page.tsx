import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getInvitationPreview } from "@/domain/invitation/invitation.service";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInvitationCard } from "@/components/invitation/accept-invitation-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invite");
  return { title: t("title") };
}

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
  const t = await getTranslations("invite");
  const ta = await getTranslations("auth");
  const tr = await getTranslations("roles");

  return (
    <AuthShell>
      <Card
        className="w-full max-w-sm animate-content-enter rounded-2xl shadow-sm"
        style={{ animationDelay: "80ms" }}
      >
        {!preview ? (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                {t("notFoundTitle")}
              </CardTitle>
              <CardDescription>{t("notFoundBody")}</CardDescription>
            </CardHeader>
          </>
        ) : preview.status !== "pending" ? (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                {preview.status === "expired" && t("expiredTitle")}
                {preview.status === "revoked" && t("revokedTitle")}
                {preview.status === "accepted" && t("acceptedTitle")}
              </CardTitle>
              <CardDescription>
                {preview.status === "accepted"
                  ? t("acceptedBody")
                  : t("askResend")}
              </CardDescription>
            </CardHeader>
            {preview.status === "accepted" && (
              <CardContent>
                <LinkButton href="/login" className="w-full">
                  {ta("signIn")}
                </LinkButton>
              </CardContent>
            )}
          </>
        ) : !session?.user ? (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                {t("heading", { family: preview.familyName })}
              </CardTitle>
              <CardDescription>
                {t("bodyGuest", {
                  inviter: preview.inviterName || t("familyOwner"),
                  role: tr(preview.role),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <LinkButton href={`/login?callbackUrl=/invite/${token}`}>
                {ta("signIn")}
              </LinkButton>
              <LinkButton
                href={`/register?callbackUrl=/invite/${token}`}
                variant="outline"
              >
                {ta("signUp")}
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
    </AuthShell>
  );
}
