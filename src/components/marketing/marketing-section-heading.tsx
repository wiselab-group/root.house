import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared eyebrow + heading + optional subcopy block reused across most
 *  marketing sections, so heading markup/spacing doesn't drift per-section. */
export function MarketingSectionHeading({
  eyebrow,
  title,
  subcopy,
  align = "center",
  className,
}: {
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
      <h2 className="font-heading text-3xl font-medium text-balance sm:text-4xl">
        {title}
      </h2>
      {subcopy && (
        <p className="text-balance text-muted-foreground">{subcopy}</p>
      )}
    </div>
  );
}
