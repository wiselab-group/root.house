import { PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const R = 23;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The round play mark of a profile voice: ▶ / ❚❚, with how far the
 * recording has played drawn as a terracotta ring around it (the same idea
 * as the story slideshow's ring on «Все фото»). Decorative — the button
 * around it carries the label.
 */
export function VoicePlayRing({
  playing,
  progress,
  className,
}: {
  playing: boolean;
  /** 0–1. */
  progress: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full bg-foreground/8 [&>svg:last-child]:fill-current",
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          strokeWidth="1.5"
          className="stroke-foreground/15"
        />
        {progress > 0 && (
          <circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            // Dynamic: how much of the recording has played.
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="stroke-primary"
          />
        )}
      </svg>
      {playing ? (
        <PauseIcon className="size-[38%]" />
      ) : (
        <PlayIcon className="size-[38%] translate-x-[6%]" />
      )}
    </span>
  );
}
