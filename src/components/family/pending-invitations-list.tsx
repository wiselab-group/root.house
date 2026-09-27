import type { InvitationRecord } from "@/domain/invitation/invitation.service";
import { useFormatter, useTranslations } from "next-intl";
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
  const t = useTranslations("members");
  const tr = useTranslations("roles");
  const format = useFormatter();
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
              {t("invitationMeta", {
                role: tr(invitation.role),
                date: format.dateTime(invitation.expiresAt, "long"),
              })}
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
