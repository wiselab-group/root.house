import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared eyebrow + heading + optional subcopy block reused across most
 *  marketing sections, so heading markup/spacing doesn't drift per-section. */
export function MarketingSectionHeading({
  id,
  eyebrow,
  title,
  subcopy,
  align = "center",
  className,
}: {
  /** For the section's aria-labelledby. */
  id?: string;
  eyebrow?: string;
  title: string;
  subcopy?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center"
          ? "mx-auto items-center text-center"
          : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-medium tracking-[0.14em] text-primary uppercase">
          {eyebrow}
        </span>
      )}
      <h2 id={id} className="font-heading text-title font-medium text-balance">
        {title}
      </h2>
      {subcopy && (
        <p className="text-balance text-muted-foreground">{subcopy}</p>
      )}
    </div>
  );
}
