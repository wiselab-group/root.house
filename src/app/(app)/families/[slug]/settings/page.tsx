import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileSection } from "@/components/person/profile-section";
import { FamilySettingsDetailsRow } from "@/components/family/family-settings-details-row";
import { FamilySettingsSlugRow } from "@/components/family/family-settings-slug-row";
import { FamilySettingsFocusRow } from "@/components/family/family-settings-focus-row";
import { FamilySettingsDeleteRow } from "@/components/family/family-settings-delete-row";
import { FamilyMembersSection } from "@/components/family/family-members-section";
import { ShareLinkSection } from "@/components/family/share-link-section";
import { ActivityLogSection } from "@/components/family/activity-log-section";
import { ScrollToHash } from "@/components/scroll-to-hash";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

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
      isOwner ? listActivityLog(familyId, { limit: 10 }) : Promise.resolve([]),
    ]);
  const t = await getTranslations("settings");
  const tf = await getTranslations("families");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <ScrollToHash />
      <SetBreadcrumbs
        items={[
          { label: tf("title"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: t("title") },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-title font-medium tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </div>

      <ProfileSection
        title={t("aboutTitle")}
        description={t("aboutDescription")}
      >
        <div className="flex flex-col gap-6">
          <FamilySettingsDetailsRow />
          <FamilySettingsSlugRow />
        </div>
      </ProfileSection>

      <ProfileSection title={t("treeTitle")} description={t("treeDescription")}>
        <FamilySettingsFocusRow />
      </ProfileSection>

      {isOwner && member && (
        <FamilyMembersSection
          familyId={familyId}
          currentUserId={member.userId}
          members={members}
          pendingInvitations={pendingInvitations}
          title={t("membersTitle")}
          description={t("membersDescription")}
        />
      )}

      {isOwner && member && (
        <ShareLinkSection
          familyId={familyId}
          shareLinks={shareLinks}
          title={t("shareTitle")}
          description={t("shareDescription")}
        />
      )}

      {isOwner && member && (
        <ProfileSection
          id="activity"
          title={t("activityTitle")}
          description={t("activityDescription")}
        >
          <ActivityLogSection entries={activityEntries} />
        </ProfileSection>
      )}

      <ProfileSection
        title={t("dangerTitle")}
        description={t("dangerDescription")}
        tone="danger"
      >
        <FamilySettingsDeleteRow />
      </ProfileSection>
    </main>
  );
}
