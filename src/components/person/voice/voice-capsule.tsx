"use client";

import { useTranslations } from "next-intl";
import type { VoiceClipSource } from "@/components/story/listen/listening-store";
import { VoicePlayRing } from "./voice-play-ring";
import { useVoicePlayback } from "./use-voice-playback";
import { voiceClock } from "./voice-wording";

/**
 * The profile hero's voice (user pick 2026-09-29, mock «A»): one frosted
 * capsule under the name and years — a ring to play, the recording's name,
 * when it was made and how long it is. While it plays the time counts
 * down and the ring fills; the sound itself is the family-wide player's,
 * so it keeps going on the tree and elsewhere.
 */
export function VoiceCapsule({
  source,
  title,
  date,
  length,
}: {
  source: VoiceClipSource;
  title: string;
  date: string | null;
  length: string;
}) {
  const t = useTranslations("voice");
  const { status, progress, remaining, toggle } = useVoicePlayback(source);
  const playing = status === "playing";
  const time = status === "idle" ? length : voiceClock(remaining);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? t("pause", { title }) : t("play", { title })}
      className="group flex w-fit max-w-full cursor-pointer items-center gap-3.5 rounded-full border border-glass-edge bg-background/45 py-1.5 pr-6 pl-1.5 text-left backdrop-blur-xl backdrop-saturate-150 transition-[background-color,transform] duration-base ease-(--ease-reveal) outline-none hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:transition-none"
    >
      <VoicePlayRing
        playing={playing}
        progress={progress}
        className="size-12 transition-colors duration-base group-hover:bg-foreground/12 sm:size-14"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base font-medium">{title}</span>
        <span className="truncate text-sm text-foreground/60 tabular-nums">
          {date && `${date} · `}
          {time}
        </span>
      </span>
    </button>
  );
}
