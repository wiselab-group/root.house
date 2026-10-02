"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassSurface } from "@/components/hero/glass";
import { TimelineRow } from "./timeline-row";
import { LifelineFactPeople } from "./lifeline-fact-people";
import type { LifelinePointView } from "./lifeline-view";
import type { TimelineRowTarget } from "./timeline-target";

const ACTION =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-glass-edge bg-glass text-sm text-foreground transition-[background-color,transform] duration-base ease-(--ease-reveal) hover:bg-glass-strong active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-3.5";
/** «Подробнее →» / «Семья →» keep their words — they say where they go. */
const ACTION_LABELED = `${ACTION} px-3.5`;
/** Editing is the same pencil everywhere: an icon, named for screen
 *  readers and in a hover tooltip (user pick 2026-10-02, to lighten the
 *  card). */
const ACTION_ICON = `${ACTION} size-9`;

/**
 * The selected dot's card under the «Линия жизни» scale. Not in the mock,
 * but the list it replaced was also where dates got edited (explicit user
 * request to keep that), so every event in the card carries the same
 * action its list row had: where Рождение/Смерть/Свадьба are edited
 * (the profile form / «Семья»), the edit form for a real event, or its
 * details page when the viewer may only look.
 */
export function LifelineEventCard({ point }: { point: LifelinePointView }) {
  return (
    <div
      aria-live="polite"
      className={`${glassSurface} flex flex-col gap-4 rounded-[20px] p-4 sm:p-5`}
    >
      {/* «1956 · ей 25» in terracotta — it belongs to the selected dot,
          the one terracotta mark on the scale (the landing's lifeline
          card, user pick 2026-10-02). */}
      <span className="text-sm text-primary tabular-nums">{point.kicker}</span>
      {point.events.map((event, index) => {
        const people = event.facts.filter((fact) => fact.kind === "people");
        return (
          <div key={event.id} className="-mt-3 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="font-heading text-[1.4rem] leading-tight font-normal text-balance">
                  {event.title}
                </h3>
                {event.details && (
                  <span className="text-sm text-foreground/55">
                    {event.details}
                  </span>
                )}
                {event.facts.map(
                  (fact) =>
                    fact.kind === "text" && (
                      <p key={fact.text} className="text-sm text-foreground/70">
                        {fact.text}
                      </p>
                    ),
                )}
                {event.text && (
                  <p className="mt-1 max-w-[54ch] text-foreground/65">
                    {event.text}
                  </p>
                )}
              </div>
              {/* The first event's action rides up level with the year
                  line, to the card's top edge (user request 2026-10-02):
                  the year's 20px line + the 4px gap below it. Later events
                  keep theirs by their own title. */}
              <EventAction
                target={event.target}
                className={index === 0 ? "-mt-6" : undefined}
              />
            </div>
            {/* Who, under a hairline: the card reads «what, when, where»
                above and «who» below (user request 2026-10-02). */}
            {people.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-glass-edge pt-3">
                {people.map((fact) => (
                  <LifelineFactPeople
                    key={fact.label}
                    label={fact.label}
                    people={fact.people}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EventAction({
  target,
  className,
}: {
  target: TimelineRowTarget;
  className?: string;
}) {
  const t = useTranslations("timeline");
  if (target.kind === "none") return null;
  const isEdit = target.kind !== "link" || target.intent === "edit";
  const label =
    target.kind === "link" ? (target.label ?? t("details")) : t("edit");
  return isEdit ? (
    <TimelineRow target={target} className={cn(ACTION_ICON, className)}>
      <span title={label} className="grid size-full place-items-center">
        <PencilIcon aria-hidden="true" />
      </span>
      <span className="sr-only">{label}</span>
    </TimelineRow>
  ) : (
    <TimelineRow target={target} className={cn(ACTION_LABELED, className)}>
      {label}
      <ArrowRightIcon aria-hidden="true" />
    </TimelineRow>
  );
}
