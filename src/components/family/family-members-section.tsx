import type { FamilyMemberWithUser } from "@/domain/family/family.service";
import type { InvitationRecord } from "@/domain/invitation/invitation.service";
import { useFormatter, useTranslations } from "next-intl";
import { MemberRoleSelect } from "./member-role-select";
import { RemoveMemberButton } from "./remove-member-button";
import { PendingInvitationsList } from "./pending-invitations-list";
import { InviteMemberForm } from "./invite-member-form";
import { ProfileSectionWithAdd } from "@/components/person/profile-section-with-add";

const ownerCount = (members: FamilyMemberWithUser[]) =>
  members.filter((m) => m.role === "owner").length;

/**
 * Server Component (fetches nothing itself — data comes from the settings
 * page, which already needed it to decide whether to render this section at
 * all) — deliberately breaks from the *-row.tsx client-context pattern used
 * by the other Settings cards, since Members needs a fresh member/invite
 * list the client-only `useFamily()` context can't provide. Interactive
 * bits (role change, remove, resend/revoke, invite) are pushed down into
 * leaf Client Components. The invite form isn't on the page: «Пригласить
 * участника» on the heading row opens it in an EditPanel (2026-10-01, same
 * as Ссылки для общего доступа).
 */
export function FamilyMembersSection({
  familyId,
  currentUserId,
  members,
  pendingInvitations,
  title,
  description,
}: {
  familyId: string;
  currentUserId: string;
  members: FamilyMemberWithUser[];
  pendingInvitations: InvitationRecord[];
  title: string;
  description: string;
}) {
  const singleOwner = ownerCount(members) <= 1;
  const t = useTranslations("members");
  const format = useFormatter();

  return (
    <ProfileSectionWithAdd
      title={title}
      description={description}
      addLabel={t("invite")}
      panelTitle={t("invite")}
      form={<InviteMemberForm familyId={familyId} />}
    >
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {member.name ?? member.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("joined", {
                  email: member.email,
                  date: format.dateTime(member.joinedAt, "long"),
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MemberRoleSelect
                familyId={familyId}
                memberUserId={member.userId}
                role={member.role}
                disabled={member.role === "owner" && singleOwner}
              />
              <RemoveMemberButton
                familyId={familyId}
                memberUserId={member.userId}
                memberLabel={member.name ?? member.email}
                disabled={
                  member.userId === currentUserId &&
                  member.role === "owner" &&
                  singleOwner
                }
              />
            </div>
          </div>
        ))}
      </div>

      {pendingInvitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("pending")}</h3>
          <PendingInvitationsList
            familyId={familyId}
            invitations={pendingInvitations}
          />
        </div>
      )}
    </ProfileSectionWithAdd>
  );
}
