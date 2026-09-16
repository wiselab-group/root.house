import type { Metadata } from "next";
import { ProfileSection } from "@/components/person/profile-section";
import { FamilySettingsDetailsRow } from "@/components/family/family-settings-details-row";
import { FamilySettingsSlugRow } from "@/components/family/family-settings-slug-row";
import { FamilySettingsFocusRow } from "@/components/family/family-settings-focus-row";
import { FamilySettingsDeleteRow } from "@/components/family/family-settings-delete-row";
import { FamilyMembersSection } from "@/components/family/family-members-section";
import { ShareLinkSection } from "@/components/family/share-link-section";
import { ActivityLogSection } from "@/components/family/activity-log-section";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getFamilySummary,
  listFamilyMembersWithUsers,
} from "@/domain/family/family.service";
import { listPendingInvitationsForFamily } from "@/domain/invitation/invitation.service";
import { listShareLinksForFamilyWithStatus } from "@/domain/share-link/share-link.service";
import { listActivityLog } from "@/domain/activity-log/activity-log.service";
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

  const [family, members, pendingInvitations, shareLinks, activityEntries] =
    await Promise.all([
      getFamilySummary(familyId),
      isOwner ? listFamilyMembersWithUsers(familyId) : Promise.resolve([]),
      isOwner ? listPendingInvitationsForFamily(familyId) : Promise.resolve([]),
      isOwner
        ? listShareLinksForFamilyWithStatus(familyId)
        : Promise.resolve([]),
      isOwner ? listActivityLog(familyId) : Promise.resolve([]),
    ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Настройки" },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Настройки
        </h1>
        <p className="text-muted-foreground">
          Название, ссылка и описание архива.
        </p>
      </div>

      <ProfileSection
        title="Об архиве"
        description="Видно всем участникам семьи."
      >
        <div className="flex flex-col gap-6">
          <FamilySettingsDetailsRow />
          <FamilySettingsSlugRow />
        </div>
      </ProfileSection>

      <ProfileSection
        title="Семейное дерево"
        description="Личная настройка — видна только вам."
      >
        <FamilySettingsFocusRow />
      </ProfileSection>

      {isOwner && member && (
        <ProfileSection
          title="Участники"
          description="Управление доступом к семейному архиву."
        >
          <FamilyMembersSection
            familyId={familyId}
            currentUserId={member.userId}
            members={members}
            pendingInvitations={pendingInvitations}
          />
        </ProfileSection>
      )}

      {isOwner && member && (
        <ProfileSection
          title="Ссылки для общего доступа"
          description="Анонимный доступ только для чтения к публичным данным семьи — без регистрации и без прав редактирования."
        >
          <ShareLinkSection familyId={familyId} shareLinks={shareLinks} />
        </ProfileSection>
      )}

      {isOwner && member && (
        <ProfileSection
          title="История действий"
          description="Кто и что изменил в архиве — видно только владельцу."
        >
          <ActivityLogSection entries={activityEntries} />
        </ProfileSection>
      )}

      <ProfileSection
        title="Опасная зона"
        description="Необратимые действия — доступны только владельцу."
        tone="danger"
      >
        <FamilySettingsDeleteRow />
      </ProfileSection>
    </main>
  );
}
