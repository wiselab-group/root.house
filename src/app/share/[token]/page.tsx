import type { Metadata } from "next";
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
import { AuthBrand } from "@/components/auth/auth-brand";
import { PublicTreeView } from "@/components/share-link/public-tree-view";
import { ShareLinkPasswordForm } from "@/components/share-link/share-link-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Семейное дерево",
};

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
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <AuthBrand />
      {access.kind === "not_found" && <StatusCard variant="not_found" />}
      {access.kind === "expired" && <StatusCard variant="expired" />}
      {access.kind === "revoked" && <StatusCard variant="revoked" />}
      {access.kind === "password_required" && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Ссылка защищена паролем</CardTitle>
            <CardDescription>
              Введите пароль, который вам передали вместе со ссылкой.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShareLinkPasswordForm token={token} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function StatusCard({
  variant,
}: {
  variant: "not_found" | "expired" | "revoked";
}) {
  const copy = {
    not_found: {
      title: "Ссылка недействительна",
      description: "Проверьте, что скопировали её полностью.",
    },
    expired: {
      title: "Срок действия ссылки истёк",
      description: "Попросите владельца архива создать новую ссылку.",
    },
    revoked: {
      title: "Эта ссылка была отозвана",
      description: "Попросите владельца архива поделиться новой ссылкой.",
    },
  }[variant];

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
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
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
        <AuthBrand />
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Материал больше не доступен</CardTitle>
            <CardDescription>
              Этот материал больше не доступен по этой ссылке.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
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
