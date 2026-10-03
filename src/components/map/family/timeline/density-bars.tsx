import { cn } from "@/lib/utils";
import type { TimelineRange } from "@/domain/place/map-snapshot";

/** How busy each stretch of years was — the slider's track shows where the
 *  family's story happens, so the user knows where to drag. */
export function DensityBars({
  range,
  year,
  buckets = 40,
  className,
}: {
  range: TimelineRange;
  year: number;
  buckets?: number;
  className?: string;
}) {
  const span = Math.max(1, range.to - range.from + 1);
  const counts = Array.from({ length: buckets }, () => 0);
  for (const [y, n] of Object.entries(range.density)) {
    const i = Math.min(
      buckets - 1,
      Math.floor(((Number(y) - range.from) / span) * buckets),
    );
    counts[i] += n;
  }
  const max = Math.max(1, ...counts);
  return (
    <div aria-hidden className={cn("flex h-6 items-end gap-0.5", className)}>
      {counts.map((n, i) => {
        const start = range.from + (i / buckets) * span;
        return (
          <span
            key={i}
            className={cn(
              "h-full flex-1 origin-bottom rounded-sm transition-colors duration-base",
              start <= year ? "bg-tree-accent/70" : "bg-tree-accent/20",
            )}
            // Bar heights are data — scaled by transform, never by height.
            style={{ transform: `scaleY(${0.12 + (0.88 * n) / max})` }}
          />
        );
      })}
    </div>
  );
}
