"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInViewOnce } from "@/hooks/use-in-view-once";

/**
 * Marks a block as "seen" the first time it scrolls into view
 * (data-inview), which starts the CSS entrances of everything inside it
 * tagged `data-reveal` and the timed sequences in marketing.css. Without
 * JS nothing is hidden (marketing.css only hides under `scripting:
 * enabled`), and reduced motion drops every delay.
 */
export function Reveal({
  children,
  className,
  threshold = 0.25,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(threshold);
  return (
    <div ref={ref} data-inview={inView} className={cn("reveal", className)}>
      {children}
    </div>
  );
}
