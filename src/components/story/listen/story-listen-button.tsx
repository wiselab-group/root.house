"use client";

import { useTranslations } from "next-intl";
import { PauseIcon, PlayIcon } from "lucide-react";
import { narrationMinutes } from "@/domain/story/story-narration";
import { useNarration } from "./narration-context";

/**
 * «Слушать · 3 мин» in the Story hero, under the reading time — on every
 * story (user decision 2026-09-29), as wide as its label. The one
 * terracotta button on the hero: it starts an action. While the story is
 * being read it pauses; paused or with a remembered spot it resumes.
 * Disabled, with the reason as its title, on a device with no voice for
 * the story's language.
 */
export function StoryListenButton() {
  const t = useTranslations("stories");
  const narration = useNarration();
  if (!narration) return null;
  const { status, index, noVoice, play, pause } = narration;
  const playing = status === "playing";
  const label = playing
    ? t("listenPause")
    : status === "paused" || index > 0
      ? t("listenResume")
      : t("listen", { minutes: narrationMinutes(narration.narration) });

  return (
    <button
      type="button"
      onClick={playing ? pause : play}
      disabled={noVoice}
      title={noVoice ? t("listenNoVoice") : undefined}
      aria-pressed={playing}
      className="pointer-events-auto inline-flex h-11 w-fit cursor-pointer items-center gap-2.5 self-start rounded-full bg-primary py-0 pr-5 pl-1.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-[transform,opacity] duration-base ease-(--ease-reveal) outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15 [&_svg]:size-3.5 [&_svg]:fill-current">
        {playing ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
      </span>
      {label}
    </button>
  );
}
