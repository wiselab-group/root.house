import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { EventRecord } from "@/domain/event/event.service";
import { TimelineRow } from "./timeline-row";
import {
  isTimelineRowInteractive,
  type TimelineRowTarget,
} from "./timeline-target";

/**
 * One row of PersonTimeline's list — split out to keep PersonTimeline
 * itself under the project's 150-line component guideline once
 * targetFor's per-event resolution logic grew past a one-liner.
 */
export function TimelineListItem({
  event,
  target,
  isLast,
  placeName,
}: {
  event: EventRecord;
  target: TimelineRowTarget;
  isLast: boolean;
  placeName: string | undefined;
}) {
  // Synthetic events (birth/death/marriage, derived from Person/Partnership
  // fields — see synthesizeDerivedEvents) have no user-authored title:
  // `event.title` is literally EVENT_TYPE_LABELS[event.type], same string
  // as the type label. A manually-created event's title is independent
  // free text, so only skip the redundant title there.
  const titleDuplicatesType = event.title === EVENT_TYPE_LABELS[event.type];
  const isInteractive = isTimelineRowInteractive(target);
  // Repeat the year on every row rather than only on change — the rail's
  // year is the row's primary scan anchor (users reading top-to-bottom
  // shouldn't have to look back up to find which year an isolated row
  // belongs to).
  const yearLabel = event.date?.year ?? "—";

  const body = (
    <>
      <span
        className={
          isInteractive
            ? "text-sm font-medium text-foreground underline decoration-border underline-offset-2"
            : "text-sm font-medium text-foreground"
        }
      >
        {titleDuplicatesType ? EVENT_TYPE_LABELS[event.type] : event.title}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        {!titleDuplicatesType && <span>{EVENT_TYPE_LABELS[event.type]}</span>}
        <span>{formatPartialDate(event.date)}</span>
        {placeName && <span>{placeName}</span>}
      </span>
    </>
  );

  return (
    <li
      className={`grid min-w-0 grid-cols-[auto_1.5rem_1fr] ${isInteractive ? "group" : ""}`}
    >
      <span className="pt-0.5 pr-2 text-left text-sm font-medium text-foreground tabular-nums">
        {yearLabel}
      </span>
      <span className="relative">
        {!isLast && (
          <span
            aria-hidden="true"
            className="absolute top-3 left-1/2 w-px -translate-x-1/2 bg-border"
            style={{ bottom: "-0.75rem" }}
          />
        )}
        <span
          aria-hidden="true"
          className={
            isInteractive
              ? "absolute top-[0.4rem] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-border bg-background transition-colors group-hover:border-primary"
              : "absolute top-[0.4rem] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-border bg-background"
          }
        />
      </span>
      <div className="min-w-0 pb-4 pl-2">
        <TimelineRow target={target}>{body}</TimelineRow>
      </div>
    </li>
  );
}
