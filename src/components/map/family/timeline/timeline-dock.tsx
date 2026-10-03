"use client";

import { useTranslations } from "next-intl";
import { PauseIcon, PlayIcon } from "lucide-react";
import { feedItemAt, type TimelineRange } from "@/domain/place/map-snapshot";
import { useFeedWording } from "../panel/use-feed-wording";
import { DensityBars } from "./density-bars";
import type { FamilyMapState } from "../use-family-map";

const ICON_BUTTON =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-base ease-(--ease-spring) outline-none hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * The timeline while it runs: play/pause, the year, a slider whose track
 * is the family's own density of events, the current beat in words, and
 * the way back to «Всё время». A real range input — keyboard and screen
 * readers get the year and what happened then (aria-valuetext).
 */
export function TimelineDock({
  state,
  range,
  year,
  playing,
  onPlay,
  onPause,
  onScrub,
  onAllTime,
}: {
  state: FamilyMapState;
  range: TimelineRange;
  year: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onScrub: (year: number) => void;
  onAllTime: () => void;
}) {
  const t = useTranslations("familyMap");
  const word = useFeedWording(state);
  const shown = Math.floor(year);
  const beat = feedItemAt(state.feed, year);
  const caption = beat ? word(beat) : null;
  const captionText = caption
    ? [caption.title, caption.detail].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[1.75rem] border border-glass-edge bg-background/75 p-3 shadow-xl shadow-black/40 backdrop-blur-xl md:pointer-fine:w-[46rem]">
      {beat && (
        <p className="truncate px-1 text-sm" aria-live="polite">
          <span className="font-semibold text-primary tabular-nums">
            {beat.year}
          </span>
          {" · "}
          {captionText}
        </p>
      )}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          aria-label={playing ? t("pause") : t("play")}
          className={ICON_BUTTON}
        >
          {playing ? (
            <PauseIcon className="size-4.5 fill-current" aria-hidden />
          ) : (
            <PlayIcon
              className="size-4.5 translate-x-px fill-current"
              aria-hidden
            />
          )}
        </button>
        <span className="w-16 shrink-0 font-heading text-[1.75rem] leading-none tabular-nums">
          {shown}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DensityBars range={range} year={year} />
          <input
            type="range"
            min={range.from}
            max={range.to}
            step={1}
            value={shown}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label={t("sliderLabel")}
            aria-valuetext={
              captionText ? `${shown}: ${captionText}` : String(shown)
            }
            className="w-full cursor-pointer accent-primary"
          />
          <div
            aria-hidden
            className="flex justify-between text-[0.6875rem] text-muted-foreground tabular-nums"
          >
            <span>{range.from}</span>
            <span>{range.to}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onAllTime}
          className="h-10 shrink-0 cursor-pointer rounded-full border border-border px-3.5 text-sm font-medium transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/8 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("allTime")}
        </button>
      </div>
    </div>
  );
}
