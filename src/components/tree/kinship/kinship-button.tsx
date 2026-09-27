"use client";

import { RouteIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KinshipTrace } from "./use-kinship-trace";

/**
 * "Родство" in the canvas's bottom bar, next to "Инструменты". Opens and
 * closes KinshipPanel. While a comparison is active and the panel is
 * closed, the button itself carries the answer ("Троюродные сёстры") with
 * a × to clear it — the result never disappears just because the panel
 * was put away.
 */
export function KinshipButton({ trace }: { trace: KinshipTrace }) {
  const { summary, isPanelOpen, setPanelOpen } = trace;

  if (summary && !isPanelOpen) {
    return (
      <div className="flex h-11 max-w-80 min-w-0 items-center rounded-full border border-primary bg-card shadow-md">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex h-full min-w-0 cursor-pointer items-center gap-2 rounded-l-full pr-1 pl-4 text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RouteIcon className="size-4 shrink-0 fill-none!" />
          <span className="truncate">{summary.headline}</span>
        </button>
        <button
          type="button"
          onClick={trace.reset}
          aria-label="Сбросить сравнение"
          className="mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast ease-(--ease-reveal) outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <XIcon className="size-4 fill-none!" />
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      aria-expanded={isPanelOpen}
      onClick={() => setPanelOpen(!isPanelOpen)}
      className="gap-2 rounded-full pr-4 pl-4 shadow-md aria-expanded:border-primary aria-expanded:text-primary"
    >
      <RouteIcon className="size-4 fill-none!" />
      Родство
    </Button>
  );
}
