import { cn } from "@/lib/utils";

/**
 * A recording's real waveform (peaks measured at upload), the played part
 * in terracotta. Bars are full-height and scaled with transform, so the
 * progress only recolors them — nothing moves in layout. Decorative.
 */
export function VoiceWaveform({
  peaks,
  progress,
  className,
}: {
  peaks: number[];
  /** 0–1. */
  progress: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-7 items-center gap-px", className)}
    >
      {peaks.map((peak, index) => (
        <span
          key={index}
          // Dynamic: this bar's measured loudness.
          style={{ transform: `scaleY(${Math.max(0.08, peak)})` }}
          className={cn(
            "h-full min-w-0 flex-1 rounded-full transition-colors duration-fast ease-(--ease-reveal)",
            index / peaks.length < progress ? "bg-primary" : "bg-foreground/25",
          )}
        />
      ))}
    </span>
  );
}
