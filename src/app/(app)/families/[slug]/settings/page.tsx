import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FamilySettingsDetailsRow } from "@/components/family/family-settings-details-row";
import { FamilySettingsSlugRow } from "@/components/family/family-settings-slug-row";
import { FamilySettingsFocusRow } from "@/components/family/family-settings-focus-row";
import { FamilySettingsDeleteRow } from "@/components/family/family-settings-delete-row";
import { FamilyMembersSection } from "@/components/family/family-members-section";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getFamilySummary,
  listFamilyMembersWithUsers,
} from "@/domain/family/family.service";
import { listPendingInvitationsForFamily } from "@/domain/invitation/invitation.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";

export const metadata: Metadata = {
  title: "Настройки",
};

export default async function FamilySettingsPage({
  params,
}: PageProps<"/families/[slug]/settings">) {
  const { slug } = await params;
  const familyId = await resolveFamilyIdBySlug(slug);
  const session = await auth();
  // Session/membership are already validated by the family layout above
  // this page (requireFamilyAccess, 'viewer' floor) — re-derived here only
  // to know the caller's role, needed to decide whether to render the
  // Members management controls (owner-only) at all.
  const member = session?.user
    ? await requireFamilyAccess(familyId, session.user.id, "viewer")
    : null;
  const isOwner = member?.role === "owner";

  const [family, members, pendingInvitations] = await Promise.all([
    getFamilySummary(familyId),
    isOwner ? listFamilyMembersWithUsers(familyId) : Promise.resolve([]),
    isOwner ? listPendingInvitationsForFamily(familyId) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Настройки" },
        ]}
      />
      <div>
        <h1 className="font-heading text-2xl font-medium">Настройки</h1>
        <p className="text-muted-foreground">
          Название, ссылка и описание архива.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Об архиве</CardTitle>
          <CardDescription>Видно всем участникам семьи.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FamilySettingsDetailsRow />
          <FamilySettingsSlugRow />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Семейное дерево</CardTitle>
          <CardDescription>
            Личная настройка — видна только вам.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FamilySettingsFocusRow />
        </CardContent>
      </Card>

      {isOwner && member && (
        <Card>
          <CardHeader>
            <CardTitle>Участники</CardTitle>
            <CardDescription>
              Управление доступом к семейному архиву.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FamilyMembersSection
              familyId={familyId}
              currentUserId={member.userId}
              members={members}
              pendingInvitations={pendingInvitations}
            />
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Опасная зона</CardTitle>
          <CardDescription>
            Необратимые действия — доступны только владельцу.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FamilySettingsDeleteRow />
        </CardContent>
      </Card>
    </main>
  );
}
