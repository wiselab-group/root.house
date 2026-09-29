"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { glassPill } from "@/components/hero/glass";
import type { RecordedTake, RecorderPhase } from "./use-voice-recorder";

const primary =
  "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default disabled:opacity-50 [&_svg]:size-4";

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * The recorder's bottom bar, one layout per phase: start → (live dot, time,
 * sound level, «Дальше», pause, «Готово») → listen back, save or record
 * again. «Дальше» is the big button while recording — it's pressed the
 * most, at every paragraph.
 */
export function RecorderControls({
  phase,
  seconds,
  take,
  levelRef,
  isLastBlock,
  saving,
  onStart,
  onNext,
  onPause,
  onResume,
  onFinish,
  onAgain,
  onSave,
}: {
  phase: RecorderPhase;
  seconds: number;
  take: RecordedTake | null;
  levelRef: RefObject<HTMLSpanElement | null>;
  isLastBlock: boolean;
  /** Upload progress 0–100 while saving, else null. */
  saving: number | null;
  onStart: () => void;
  onNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onAgain: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("stories");

  if (phase === "review" && take) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{t("recordReview")}</p>
        <audio controls src={take.url} className="w-full max-w-md" />
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onAgain}
            disabled={saving !== null}
            className={cn(glassPill, "h-12")}
          >
            <RotateCcwIcon aria-hidden="true" />
            {t("recordAgain")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving !== null}
            className={primary}
          >
            <CheckIcon aria-hidden="true" />
            {saving === null
              ? t("recordSave")
              : t("recordSaving", { percent: saving })}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "recording" || phase === "paused") {
    const live = phase === "recording";
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span
          className="flex items-center gap-2 text-sm tabular-nums"
          role="status"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 rounded-full bg-destructive",
              live ? "animate-pulse" : "opacity-40",
            )}
          />
          <span className="sr-only">
            {live ? t("recordLive") : t("recordPaused")}
          </span>
          {clock(seconds)}
        </span>
        <span
          aria-hidden="true"
          title={t("recordLevel")}
          className="h-1.5 w-16 overflow-hidden rounded-full bg-glass-strong"
        >
          <span
            ref={levelRef}
            className="block h-full origin-left scale-x-[var(--level,0)] rounded-full bg-foreground/80 transition-transform duration-75 ease-(--ease-reveal)"
          />
        </span>
        <button
          type="button"
          onClick={live ? onPause : onResume}
          className={cn(glassPill, "h-12")}
        >
          {live ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
          {live ? t("recordPause") : t("recordResume")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!live || isLastBlock}
          className={primary}
        >
          <ArrowDownIcon aria-hidden="true" />
          {t("recordNext")}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className={cn(glassPill, "h-12")}
        >
          <CheckIcon aria-hidden="true" />
          {t("recordFinish")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <button type="button" onClick={onStart} className={primary}>
        <MicIcon aria-hidden="true" />
        {t("recordStart")}
      </button>
    </div>
  );
}
