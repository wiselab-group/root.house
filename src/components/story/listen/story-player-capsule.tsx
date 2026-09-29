"use client";

import { useTranslations } from "next-intl";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import type { NarrationPlayerState } from "./narration-types";
import { PlayerUnheardHint } from "./player-unheard-hint";

const iconButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors duration-fast outline-none hover:bg-glass focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 [&_svg]:size-4";

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The capsule's line: what's playing — a link back when it's off its
 *  own page — then whose voice it is (or when it was recorded). */
export interface CapsuleHeading {
  title: string;
  href: string | null;
  subtitle: string;
}

/**
 * The family player once listening has started: a frosted capsule pinned
 * to the bottom of the screen (the same glass as the tree's dock), so it
 * stays in reach however far the reader scrolls. Play/pause, back/forward
 * (a phrase or block of a story, 15 s of a profile's voice), where you are
 * (the heading, time, a slider), speed and close. A story's times are
 * estimates for the device voice — it reports none. Rendered by the
 * family-wide player (ActivePlayer), so it stays on every family page;
 * over the tree's dock or the photo arrange bar it moves up (globals.css,
 * .story-player-bar).
 */
export function StoryPlayerCapsule({
  player,
  heading,
}: {
  player: NarrationPlayerState;
  heading: CapsuleHeading;
}) {
  const t = useTranslations("stories");
  if (player.status === "idle") return null;
  const { status, rate, elapsed, total } = player;
  const playing = status === "playing";
  const position = `${clock(elapsed)} / ${clock(total)}`;

  return (
    <div className="story-player-bar pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-5">
      {player.unheard && <PlayerUnheardHint />}
      <section
        aria-label={t("listenPlayer")}
        className="pointer-events-auto flex w-full max-w-xl animate-in items-center gap-2 rounded-full border border-glass-edge bg-background/70 p-1.5 pr-2 shadow-xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150 duration-slow ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={playing ? player.pause : player.play}
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
          onClick={() => player.step(-1)}
          disabled={elapsed === 0}
          aria-label={t("listenPrev")}
          className={`${iconButton} max-sm:hidden`}
        >
          <SkipBackIcon aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => player.step(1)}
          aria-label={t("listenNext")}
          className={`${iconButton} max-sm:hidden`}
        >
          <SkipForwardIcon aria-hidden="true" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1 px-1">
          <p className="truncate text-sm font-medium">
            {heading.href ? (
              <Link
                href={heading.href}
                className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {heading.title}
              </Link>
            ) : (
              heading.title
            )}
            <span className="font-normal text-muted-foreground">
              {" · "}
              {heading.subtitle}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(total))}
              step={1}
              value={Math.floor(elapsed)}
              onChange={(event) => player.seekTo(Number(event.target.value))}
              aria-label={t("listenPosition")}
              aria-valuetext={position}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
            />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {position}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={player.cycleRate}
          aria-label={t("listenSpeed", { rate })}
          className="h-8 shrink-0 cursor-pointer rounded-full border border-glass-edge px-2.5 text-xs font-medium tabular-nums outline-none hover:bg-glass focus-visible:ring-2 focus-visible:ring-ring"
        >
          {rate}×
        </button>
        <button
          type="button"
          onClick={player.stop}
          aria-label={t("listenStop")}
          className={iconButton}
        >
          <XIcon aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
