import type { ShareLinkWithStatus } from "@/domain/share-link/share-link.service";
import { ShareLinkRowActions } from "./share-link-row-actions";

const STATUS_LABELS: Record<ShareLinkWithStatus["status"], string> = {
  active: "Активна",
  expired: "Истекла",
  revoked: "Отозвана",
};

/** Server Component receiving already-fetched share links as props (see
 *  ShareLinkSection) — renders the static row, delegates revoke to a client
 *  leaf component, same split as PendingInvitationsList/InvitationRowActions. */
export function ShareLinksList({
  familyId,
  shareLinks,
  focusPersonNames,
}: {
  familyId: string;
  shareLinks: ShareLinkWithStatus[];
  /** personId -> display name, for the "Фокус: <имя>" line — resolved by
   *  the parent Server Component so this stays a plain render pass. */
  focusPersonNames: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {shareLinks.map((link) => (
        <div
          key={link.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {STATUS_LABELS[link.status]} · Фокус:{" "}
              {focusPersonNames[link.focusPersonId] ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {link.passwordHash ? "Защищена паролем" : "Без пароля"} ·{" "}
              {link.expiresAt
                ? `истекает ${new Intl.DateTimeFormat("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(link.expiresAt)}`
                : "не истекает"}
            </span>
          </div>
          <ShareLinkRowActions
            familyId={familyId}
            shareLinkId={link.id}
            disabled={link.status !== "active"}
          />
        </div>
      ))}
    </div>
  );
}
