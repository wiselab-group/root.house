import type { InvitationRecord } from "@/domain/invitation/invitation.service";
import { ROLE_LABELS } from "@/domain/family/role-labels";
import { InvitationRowActions } from "./invitation-row-actions";

/** Server Component receiving already-fetched pending invitations as props
 *  (see FamilyMembersSection) — renders the static row, delegates
 *  resend/revoke to a client leaf component. */
export function PendingInvitationsList({
  familyId,
  invitations,
}: {
  familyId: string;
  invitations: InvitationRecord[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{invitation.email}</span>
            <span className="text-xs text-muted-foreground">
              Роль: {ROLE_LABELS[invitation.role]} · истекает{" "}
              {new Intl.DateTimeFormat("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(invitation.expiresAt)}
            </span>
          </div>
          <InvitationRowActions
            familyId={familyId}
            invitationId={invitation.id}
          />
        </div>
      ))}
    </div>
  );
}
