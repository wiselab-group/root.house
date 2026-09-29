"use client";

import { useTranslations } from "next-intl";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react";
import { useNarration } from "./narration-context";

const iconButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors duration-fast outline-none hover:bg-glass focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 [&_svg]:size-4";

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The story's player once listening has started: a frosted capsule pinned
 * to the bottom of the screen (the same glass as the tree's dock), so it
 * stays in reach however far the reader scrolls. Play/pause, a phrase
 * back/forward, where you are (chapter, time, a slider over every phrase),
 * speed and close. Times are estimates — the device voice reports none.
 * «Голос устройства» says honestly whose voice this is.
 */
export function StoryPlayerCapsule() {
  const t = useTranslations("stories");
  const player = useNarration();
  if (!player || player.status === "idle") return null;
  const { narration, index, status, rate, play, pause, stop, seek, cycleRate } =
    player;
  const phrase = narration.phrases[index];
  const chapter = narration.chapters.find((c) => c.number === phrase?.chapter);
  const elapsed = narration.phrases
    .slice(0, index)
    .reduce((sum, p) => sum + p.seconds, 0);
  const playing = status === "playing";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-5">
      <section
        aria-label={t("listenPlayer")}
        className="pointer-events-auto flex w-full max-w-xl animate-in items-center gap-2 rounded-full border border-glass-edge bg-background/70 p-1.5 pr-2 shadow-xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150 duration-slow ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={playing ? pause : play}
          aria-label={playing ? t("listenPause") : t("listenPlay")}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-4 [&_svg]:fill-current"
        >
          {playing ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => seek(index - 1)}
          disabled={index === 0}
          aria-label={t("listenPrev")}
          className={`${iconButton} max-sm:hidden`}
        >
          <SkipBackIcon aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => seek(index + 1)}
          disabled={index >= narration.phrases.length - 1}
          aria-label={t("listenNext")}
          className={`${iconButton} max-sm:hidden`}
        >
          <SkipForwardIcon aria-hidden="true" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1 px-1">
          <p className="truncate text-sm font-medium">
            {chapter?.title ?? t("listenOpening")}
            <span className="font-normal text-muted-foreground">
              {" · "}
              {t("listenDeviceVoice")}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={narration.phrases.length - 1}
              value={index}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label={t("listenPosition")}
              aria-valuetext={`${clock(elapsed / rate)} / ${clock(narration.totalSeconds / rate)}`}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
            />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {clock(elapsed / rate)} / {clock(narration.totalSeconds / rate)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          aria-label={t("listenSpeed", { rate })}
          className="h-8 shrink-0 cursor-pointer rounded-full border border-glass-edge px-2.5 text-xs font-medium tabular-nums outline-none hover:bg-glass focus-visible:ring-2 focus-visible:ring-ring"
        >
          {rate}×
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label={t("listenStop")}
          className={iconButton}
        >
          <XIcon aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
