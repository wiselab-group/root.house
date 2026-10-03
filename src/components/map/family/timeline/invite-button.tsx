"use client";

import { useTranslations } from "next-intl";
import { PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapStats, TimelineRange } from "@/domain/place/map-snapshot";

/** «▶ Как семья сюда пришла» — the map opens on the whole picture; the
 *  story in time is offered, not forced (decided with the user 2026-10-03). */
export function InviteButton({
  range,
  stats,
  onPlay,
  className,
}: {
  range: TimelineRange;
  stats: MapStats;
  onPlay: () => void;
  className?: string;
}) {
  const t = useTranslations("familyMap");
  return (
    <button
      type="button"
      onClick={onPlay}
      className={cn(
        "group flex cursor-pointer items-center gap-3.5 rounded-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-base ease-(--ease-spring) group-hover:scale-105 group-active:scale-95">
        <PlayIcon className="size-5 translate-x-px fill-current" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-heading text-base font-medium">
          {t("invite")}
        </span>
        <span className="truncate text-xs text-muted-foreground tabular-nums">
          {t("inviteMeta", {
            from: range.from,
            to: range.to,
            generations: stats.generations,
          })}
        </span>
      </span>
    </button>
  );
}
