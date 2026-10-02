import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared surface for the feature illustrations — a quiet raised card on
 *  the dark archive page, and the container every cqw size inside it is
 *  measured against. */
export function PanelFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container relative size-full overflow-hidden rounded-3xl border-[1.5px] border-glass-edge bg-card/50 p-[6%]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Frosted pill, as in the profile/story heroes' glass buttons and chips. */
export function GlassPill({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-glass-edge bg-glass-strong px-[0.9em] py-[0.35em] text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] whitespace-nowrap text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
