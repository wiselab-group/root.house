"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "lucide-react";
import type { MapBranch, MapPlace } from "@/domain/place/place-map.service";

/**
 * A root branch as an obviously pressable card (user ask: «должно быть
 * интуитивно понятно, что можно выбрать ветвь»): the family name, where it
 * started, the route of places it took, and an arrow. Hover/focus already
 * previews the branch's path on the map before any click.
 */
export function BranchCard({
  branch,
  joins,
  placeById,
  onSelect,
  onPreview,
}: {
  branch: MapBranch;
  /** The family name of the branch this line flowed into. */
  joins: string | null;
  placeById: Map<string, MapPlace>;
  onSelect: () => void;
  onPreview: (on: boolean) => void;
}) {
  const t = useTranslations("familyMap");
  const origin = placeById.get(branch.originPlaceId)?.name ?? "";
  const route = branch.placeIds
    .map((id) => placeById.get(id)?.name)
    .filter(Boolean);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onPointerEnter={() => onPreview(true)}
        onPointerLeave={() => onPreview(false)}
        onFocus={() => onPreview(true)}
        onBlur={() => onPreview(false)}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card px-4 py-3.5 text-left transition-[border-color,background-color,transform] duration-base ease-(--ease-reveal) outline-none hover:border-primary hover:bg-primary/6 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.98]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-heading text-lg leading-tight">
              {branch.surname ?? t("branchUnnamed")}
            </span>
            <span className="text-xs text-muted-foreground">
              {branch.since !== null
                ? t("branchOrigin", { place: origin, year: branch.since })
                : origin}
            </span>
          </span>
          {(route.length > 1 || joins) && (
            <span className="text-xs leading-relaxed text-muted-foreground transition-colors duration-base group-hover:text-foreground">
              {[
                route.length > 1 ? route.join(" › ") : null,
                joins ? t("branchJoins", { surname: joins }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {t("branchMeta", {
              generations: branch.generations,
              people: branch.lineIds.length,
            })}
          </span>
        </span>
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/8 transition-[background-color,color,transform] duration-base ease-(--ease-spring) group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground"
        >
          <ArrowRightIcon className="size-4" />
        </span>
      </button>
    </li>
  );
}
