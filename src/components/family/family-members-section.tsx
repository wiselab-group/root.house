import type { FamilyMemberWithUser } from "@/domain/family/family.service";
import type { InvitationRecord } from "@/domain/invitation/invitation.service";
import { ROLE_LABELS } from "@/domain/family/role-labels";
import { MemberRoleSelect } from "./member-role-select";
import { RemoveMemberButton } from "./remove-member-button";
import { PendingInvitationsList } from "./pending-invitations-list";
import { InviteMemberForm } from "./invite-member-form";

const ownerCount = (members: FamilyMemberWithUser[]) =>
  members.filter((m) => m.role === "owner").length;

/**
 * Server Component (fetches nothing itself — data comes from the settings
 * page, which already needed it to decide whether to render this section at
 * all) — deliberately breaks from the *-row.tsx client-context pattern used
 * by the other Settings cards, since Members needs a fresh member/invite
 * list the client-only `useFamily()` context can't provide. Interactive
 * bits (role change, remove, resend/revoke, invite) are pushed down into
 * leaf Client Components.
 */
export function FamilyMembersSection({
  familyId,
  currentUserId,
  members,
  pendingInvitations,
}: {
  familyId: string;
  currentUserId: string;
  members: FamilyMemberWithUser[];
  pendingInvitations: InvitationRecord[];
}) {
  const singleOwner = ownerCount(members) <= 1;

  return (
    <div className="flex flex-col gap-6">
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
                {member.email} · с{" "}
                {new Intl.DateTimeFormat("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(member.joinedAt)}
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
          <h3 className="text-sm font-medium">Ожидают ответа</h3>
          <PendingInvitationsList
            familyId={familyId}
            invitations={pendingInvitations}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Пригласить участника</h3>
        <InviteMemberForm familyId={familyId} roleLabels={ROLE_LABELS} />
      </div>
    </div>
  );
}
