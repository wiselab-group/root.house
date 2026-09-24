"use client";

import { ArrowRightIcon, PencilIcon } from "lucide-react";
import { glassSurface } from "@/components/hero/glass";
import { TimelineRow } from "./timeline-row";
import type { LifelinePointView } from "./lifeline-view";
import type { TimelineRowTarget } from "./timeline-target";

const ACTION =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-glass-edge bg-glass px-3.5 text-sm text-foreground transition-[background-color,transform] duration-200 ease-(--ease-reveal) hover:bg-glass-strong active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-3.5";

/**
 * The selected dot's card under the «Линия жизни» scale. Not in the mock,
 * but the list it replaced was also where dates got edited (explicit user
 * request to keep that), so every event in the card carries the same
 * action its list row had: the date dialog for Рождение/Смерть/Свадьба,
 * the edit form for a real event, or its details page when the viewer may
 * only look.
 */
export function LifelineEventCard({ point }: { point: LifelinePointView }) {
  return (
    <div
      aria-live="polite"
      className={`${glassSurface} flex flex-col gap-5 rounded-[20px] p-5 shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_22%,transparent)] sm:p-6`}
    >
      <span className="text-[11px] tracking-[0.12em] text-foreground/45 uppercase">
        {point.kicker}
      </span>
      {point.events.map((event) => (
        <div
          key={event.id}
          className="-mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-heading text-[1.3rem] font-normal text-balance">
              {event.title}
            </h3>
            {event.details && (
              <span className="text-sm text-foreground/55">
                {event.details}
              </span>
            )}
            {event.text && (
              <p className="mt-1 max-w-[54ch] text-foreground/65">
                {event.text}
              </p>
            )}
          </div>
          <EventAction target={event.target} />
        </div>
      ))}
    </div>
  );
}

function EventAction({ target }: { target: TimelineRowTarget }) {
  if (target.kind === "none") return null;
  const label =
    target.kind === "link"
      ? (target.label ?? "Подробнее")
      : target.kind === "event-edit-dialog"
        ? "Редактировать"
        : "Изменить дату";
  return (
    <TimelineRow target={target} className={ACTION}>
      {target.kind === "link" ? (
        <>
          {label}
          <ArrowRightIcon aria-hidden="true" />
        </>
      ) : (
        <>
          <PencilIcon aria-hidden="true" />
          {label}
        </>
      )}
    </TimelineRow>
  );
}
