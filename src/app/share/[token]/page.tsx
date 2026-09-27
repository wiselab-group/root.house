import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { families } from "@/db/schema";
import { resolveShareLinkAccess } from "@/domain/share-link/share-link.service";
import {
  getPublicTreeLayout,
  PersonNotPubliclyVisibleError,
} from "@/domain/share-link/public-tree.service";
import type { ShareLinkVisibilityScope } from "@/domain/share-link/share-link.service";
import { AuthShell } from "@/components/auth/auth-shell";
import { PublicTreeView } from "@/components/share-link/public-tree-view";
import { ShareLinkPasswordForm } from "@/components/share-link/share-link-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("share");
  return { title: t("title") };
}

/**
 * Anonymous, read-only entry point to a Share Link — deliberately outside
 * the (app) route group (no auth-gated layout above it) and never calls
 * auth() itself: even a logged-in family member visiting their own share
 * link sees exactly this same anonymous rendering, keeping the security
 * boundary independent of session state (see share-link.service.ts::
 * resolveShareLinkAccess, the single source of truth for access here).
 */
export default async function SharePage({
  params,
}: PageProps<"/share/[token]">) {
  const { token } = await params;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("share_access")?.value ?? null;

  const access = await resolveShareLinkAccess(token, cookieValue);
  const t = await getTranslations("share");

  if (access.kind === "granted") {
    return (
      <GrantedTreeView
        familyId={access.link.familyId}
        focusPersonId={access.link.focusPersonId}
        visibilityScope={access.link.visibilityScope}
        token={token}
      />
    );
  }

  return (
    <AuthShell>
      {access.kind === "not_found" && <StatusCard variant="not_found" />}
      {access.kind === "expired" && <StatusCard variant="expired" />}
      {access.kind === "revoked" && <StatusCard variant="revoked" />}
      {access.kind === "password_required" && (
        <Card
          className="w-full max-w-sm animate-content-enter rounded-2xl shadow-sm"
          style={{ animationDelay: "80ms" }}
        >
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              {t("protectedTitle")}
            </CardTitle>
            <CardDescription>{t("protectedBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ShareLinkPasswordForm token={token} />
          </CardContent>
        </Card>
      )}
    </AuthShell>
  );
}

function StatusCard({
  variant,
}: {
  variant: "not_found" | "expired" | "revoked";
}) {
  const t = useTranslations("share");
  const copy = {
    not_found: { title: t("notFoundTitle"), description: t("notFoundBody") },
    expired: { title: t("expiredTitle"), description: t("expiredBody") },
    revoked: { title: t("revokedTitle"), description: t("revokedBody") },
  }[variant];

  return (
    <Card
      className="w-full max-w-sm animate-content-enter rounded-2xl shadow-sm"
      style={{ animationDelay: "80ms" }}
    >
      <CardHeader>
        <CardTitle className="font-heading text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * Full-bleed tree canvas — TreeCanvas already manages its own viewport
 * height (see tree-canvas.tsx), so this renders outside the centered
 * <main>/<Card> chrome the other states use.
 */
async function GrantedTreeView({
  familyId,
  focusPersonId,
  visibilityScope,
  token,
}: {
  familyId: string;
  focusPersonId: string;
  visibilityScope: ShareLinkVisibilityScope;
  token: string;
}) {
  const [family, graph] = await Promise.all([
    db.query.families.findFirst({
      where: eq(families.id, familyId),
      columns: { name: true, slug: true },
    }),
    getPublicTreeLayout(familyId, focusPersonId, visibilityScope).catch(
      (err) => {
        if (err instanceof PersonNotPubliclyVisibleError) return null;
        throw err;
      },
    ),
  ]);

  if (!graph) {
    const t = await getTranslations("share");
    return (
      <AuthShell>
        <Card className="w-full max-w-sm animate-content-enter rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              {t("goneTitle")}
            </CardTitle>
            <CardDescription>{t("goneBody")}</CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }

  return (
    <PublicTreeView
      graph={graph}
      familyId={familyId}
      familySlug={family?.slug ?? ""}
      token={token}
    />
  );
}
