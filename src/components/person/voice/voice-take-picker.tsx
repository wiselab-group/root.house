"use client";

import { useTranslations } from "next-intl";
import { useRef, type RefObject } from "react";
import {
  MicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AUDIO_ACCEPT, AUDIO_MAX_BYTES } from "@/domain/media/upload-rules";
import type { RecorderPhase } from "@/components/story/listen/use-voice-recorder";
import { voiceClock } from "./voice-wording";

const choice =
  "flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border border-border px-4 py-5 text-sm font-medium outline-none transition-[background-color,transform] duration-base ease-(--ease-reveal) hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] [&_svg]:size-5 [&_svg]:text-primary";
const small =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 text-sm outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5";

/**
 * Where a profile voice comes from: recorded right here (the story
 * recorder's microphone hook, without a script) or a file — a digitized
 * tape, a voicemail. Once there is one, it can be listened to and swapped.
 */
export function VoiceTakePicker({
  phase,
  seconds,
  levelRef,
  take,
  onStart,
  onPause,
  onResume,
  onFinish,
  onPick,
  onClear,
}: {
  phase: RecorderPhase;
  seconds: number;
  levelRef: RefObject<HTMLSpanElement | null>;
  take: { url: string } | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const t = useTranslations("voice");
  const ts = useTranslations("stories");
  const input = useRef<HTMLInputElement>(null);

  if (take) {
    return (
      <div className="flex flex-col gap-2">
        <audio controls src={take.url} className="w-full" />
        <button
          type="button"
          onClick={onClear}
          className={cn(small, "self-start")}
        >
          <RotateCcwIcon aria-hidden="true" />
          {t("recordAgain")}
        </button>
      </div>
    );
  }

  if (phase === "recording" || phase === "paused") {
    const live = phase === "recording";
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
        <span
          role="status"
          className="flex items-center gap-2 text-sm tabular-nums"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 rounded-full bg-destructive",
              live ? "animate-pulse" : "opacity-40",
            )}
          />
          <span className="sr-only">
            {live ? ts("recordLive") : ts("recordPaused")}
          </span>
          {voiceClock(seconds)}
        </span>
        <span
          aria-hidden="true"
          className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10"
        >
          <span
            ref={levelRef}
            className="block h-full origin-left scale-x-[var(--level,0)] rounded-full bg-foreground/80 transition-transform duration-75 ease-(--ease-reveal)"
          />
        </span>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={live ? onPause : onResume}
            className={small}
          >
            {live ? (
              <PauseIcon aria-hidden="true" />
            ) : (
              <PlayIcon aria-hidden="true" />
            )}
            {live ? ts("recordPause") : ts("recordResume")}
          </button>
          <button type="button" onClick={onFinish} className={small}>
            <SquareIcon aria-hidden="true" />
            {t("recordStop")}
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={onStart} className={choice}>
          <MicIcon aria-hidden="true" />
          {t("recordNow")}
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={choice}
        >
          <UploadIcon aria-hidden="true" />
          {t("pickFile")}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("fileHint", { max: Math.round(AUDIO_MAX_BYTES / 1024 ** 2) })}
      </p>
      {(phase === "denied" || phase === "unsupported") && (
        <p role="alert" className="text-sm text-destructive">
          {phase === "denied" ? ts("recordNoMic") : ts("recordUnsupported")}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={AUDIO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
