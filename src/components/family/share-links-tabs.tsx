"use client";

import type { ShareLinkWithStatus } from "@/domain/share-link/share-link.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareLinksList } from "./share-links-list";

type Status = ShareLinkWithStatus["status"];

const TAB_LABELS: Record<Status, string> = {
  active: "Активные",
  expired: "Истёкшие",
  revoked: "Отозванные",
};

const TAB_ORDER: Status[] = ["active", "expired", "revoked"];

/**
 * Groups the family's share links by status into tabs — kept as a Client
 * Component only for the tab-switch interaction; ShareLinksList underneath
 * stays the same server-rendered row markup for every tab. Defaults to
 * "active" (falling back to whichever tab has links, so a family with only
 * revoked/expired links doesn't land on an empty pane) so revoked/expired
 * links stay reachable for audit ("who had access before") without
 * cluttering the tab a family actually cares about day-to-day.
 */
export function ShareLinksTabs({
  familyId,
  shareLinks,
  focusPersonNames,
}: {
  familyId: string;
  shareLinks: ShareLinkWithStatus[];
  focusPersonNames: Record<string, string>;
}) {
  const byStatus: Record<Status, ShareLinkWithStatus[]> = {
    active: [],
    expired: [],
    revoked: [],
  };
  for (const link of shareLinks) byStatus[link.status].push(link);

  const defaultTab =
    TAB_ORDER.find((status) => byStatus[status].length > 0) ?? "active";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="h-11! w-full">
        {TAB_ORDER.map((status) => (
          <TabsTrigger key={status} value={status} className="px-3 text-sm">
            {TAB_LABELS[status]} ({byStatus[status].length})
          </TabsTrigger>
        ))}
      </TabsList>
      {TAB_ORDER.map((status) => (
        <TabsContent key={status} value={status} className="pt-3">
          {byStatus[status].length > 0 ? (
            <ShareLinksList
              familyId={familyId}
              shareLinks={byStatus[status]}
              focusPersonNames={focusPersonNames}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {status === "active"
                ? "Нет активных ссылок."
                : status === "expired"
                  ? "Нет истёкших ссылок."
                  : "Нет отозванных ссылок."}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
