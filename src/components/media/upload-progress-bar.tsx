import { cn } from "@/lib/utils";

/**
 * Upload progress for one photo (see lib/upload-photo.ts for what the
 * fraction means — 0–90% is the bytes actually leaving the browser, the
 * rest is recording the photo). Sage (--tree-accent), the same green as the
 * profile's lifeline axis — per user request; progress is a state, not an
 * action, so not terracotta. Fills with a scaleX transform, not width, per
 * the animation rules, easing toward each new reading.
 */
export function UploadProgressBar({
  value,
  label = "Загрузка фото",
  className,
}: {
  /** 0–1. */
  value: number;
  label?: string;
  className?: string;
}) {
  const fraction = Math.min(Math.max(value, 0), 1);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      className={cn(
        "h-1 overflow-hidden rounded-full bg-tree-accent/20",
        className,
      )}
    >
      <div
        className="h-full origin-left rounded-full bg-tree-accent transition-transform duration-300 ease-(--ease-reveal) motion-reduce:transition-none"
        style={{ transform: `scaleX(${fraction})` }}
      />
    </div>
  );
}
