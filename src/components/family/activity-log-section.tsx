import type { ActivityLogEntry } from "@/domain/activity-log/activity-log.service";
import { ACTIVITY_ACTION_VERBS } from "@/domain/activity-log/activity-log-labels";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Owner-only "История действий" list — server component, fed a pre-fetched
 * page of entries (same pattern as FamilyMembersSection: the settings page
 * already needed the data to decide whether to render this section at all).
 * No diff/before-after values are shown, only the fact + entityLabel — see
 * db/schema/activity-log.ts's doc comment for why.
 */
export function ActivityLogSection({
  entries,
}: {
  entries: ActivityLogEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Пока нет действий — здесь появятся изменения, которые вносят участники
        семьи.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3 border-l border-border pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-0.5">
          <span className="text-sm">
            <span className="font-medium">
              {entry.actorName ?? entry.actorEmail}
            </span>{" "}
            {ACTIVITY_ACTION_VERBS[entry.action]}{" "}
            <span className="font-medium">{entry.entityLabel}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {dateFormatter.format(entry.createdAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}
