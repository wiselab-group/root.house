import { useFormatter, useTranslations } from "next-intl";
import type { ShareLinkWithStatus } from "@/domain/share-link/share-link.service";
import { ShareLinkRowActions } from "./share-link-row-actions";

/** Server Component receiving already-fetched share links as props (see
 *  ShareLinkSection) — renders the static row, delegates revoke to a client
 *  leaf component, same split as PendingInvitationsList/InvitationRowActions.
 *  Status isn't shown per-row: every caller (ShareLinksTabs) already groups
 *  links by status into a labeled tab, so repeating it here would be
 *  redundant. */
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
  const t = useTranslations("shareLinks");
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-2">
      {shareLinks.map((link) => (
        <div
          key={link.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {t("focusLine", {
                name: focusPersonNames[link.focusPersonId] ?? "—",
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {link.passwordHash ? t("protected") : t("noPassword")} ·{" "}
              {link.expiresAt
                ? t("expires", {
                    date: format.dateTime(link.expiresAt, "long"),
                  })
                : t("noExpiry")}
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
