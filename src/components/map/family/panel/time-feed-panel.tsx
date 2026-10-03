"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { feedItemAt, type FeedItem } from "@/domain/place/map-snapshot";
import { Eyebrow } from "./panel-bits";
import { StatsLine } from "./stats-line";
import { useFeedWording } from "./use-feed-wording";
import type { FamilyMapState } from "../use-family-map";

/** While the timeline runs, the panel is the story: every beat in order,
 *  the current one lit and kept in view, what's ahead still faint. */
export function TimeFeedPanel({
  state,
  year,
  onJump,
}: {
  state: FamilyMapState;
  year: number;
  onJump: (year: number) => void;
}) {
  const t = useTranslations("familyMap");
  const word = useFeedWording(state);
  const reducedMotion = useReducedMotion();
  const current = feedItemAt(state.feed, year);
  const currentRef = useRef<HTMLLIElement>(null);
  const shownYear = Math.floor(year);

  // Scrolls the panel's own list only — scrollIntoView would also scroll
  // every ancestor, the overflow-hidden map wrapper included, sliding the
  // whole map off screen on a phone.
  useEffect(() => {
    const item = currentRef.current;
    const list = item?.closest<HTMLElement>("[data-panel-scroll]");
    if (!item || !list) return;
    const box = list.getBoundingClientRect();
    const row = item.getBoundingClientRect();
    if (row.top >= box.top && row.bottom <= box.bottom) return;
    list.scrollTo({
      top: list.scrollTop + row.top - box.top - box.height / 3,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [current?.key, reducedMotion]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <Eyebrow>{t("feedTitle", { year: shownYear })}</Eyebrow>
        <StatsLine stats={state.snapshot.stats} />
      </header>
      <ol className="flex flex-col gap-0.5">
        {state.feed.map((item: FeedItem) => {
          const isNow = item.key === current?.key;
          const ahead = item.year > shownYear;
          const { title, detail } = word(item);
          return (
            <li key={item.key} ref={isNow ? currentRef : undefined}>
              <button
                type="button"
                onClick={() => onJump(item.year)}
                aria-current={isNow ? "step" : undefined}
                className={cn(
                  "-mx-2.5 flex w-[calc(100%+1.25rem)] cursor-pointer gap-3 rounded-xl px-2.5 py-2 text-left transition-[background-color,opacity] duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring",
                  isNow && "bg-primary/12 hover:bg-primary/16",
                  ahead && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "w-10 shrink-0 pt-px text-sm font-semibold tabular-nums",
                    isNow ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.year}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{title}</span>
                  {detail && (
                    <span className="text-xs text-muted-foreground">
                      {detail}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
