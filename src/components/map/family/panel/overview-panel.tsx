"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlayIcon, PlusIcon, SearchIcon } from "lucide-react";
import { snapshotAt } from "@/domain/place/map-snapshot";
import { BranchCard } from "./branch-card";
import { Eyebrow } from "./panel-bits";
import { StatsLine } from "./stats-line";
import { GapsBox } from "./gaps-box";
import { NowPlaces } from "./now-places";
import type { FamilyMapState } from "../use-family-map";

const SHOWN_BRANCHES = 3;

/** The map's front page: where we come from (branches), where we are now,
 *  and — for editors — what the map is still missing. */
export function OverviewPanel({
  state,
  onPlay,
}: {
  state: FamilyMapState;
  /** «▶ how we got here» — on touch screens it lives in the sheet's strip;
   *  null when nothing has a year to play. */
  onPlay: (() => void) | null;
}) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("counts");
  const { data, setFocus, setHoveredBranch } = state;
  const [allBranches, setAllBranches] = useState(false);
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  const branches = allBranches
    ? data.branches
    : data.branches.slice(0, SHOWN_BRANCHES);
  const hidden = data.branches.length - branches.length;

  return (
    <>
      <header className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium">{t("title")}</h1>
          <StatsLine stats={snapshotAt(data.model, "all").stats} />
        </div>
        {onPlay && (
          <button
            type="button"
            aria-label={t("invite")}
            onClick={onPlay}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-base ease-(--ease-spring) outline-none active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 md:pointer-fine:hidden"
          >
            <PlayIcon
              className="size-5 translate-x-px fill-current"
              aria-hidden
            />
          </button>
        )}
      </header>

      <button
        type="button"
        onClick={() => setFocus({ kind: "search" })}
        className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl bg-foreground/6 px-3.5 text-left text-sm text-muted-foreground transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SearchIcon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{t("searchPlaceholder")}</span>
        <span className="text-xs">
          {tc("places", { count: data.places.length })}
        </span>
      </button>

      {data.places.length === 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
          <h2 className="font-heading text-lg font-medium">
            {t("emptyTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
          {state.canEdit && (
            <button
              type="button"
              onClick={() => setFocus({ kind: "editPlace", placeId: null })}
              className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-base ease-(--ease-spring) outline-none hover:scale-[1.02] focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <PlusIcon className="size-4" aria-hidden />
              {t("addPlace")}
            </button>
          )}
        </section>
      )}

      {data.branches.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <Eyebrow>
              {t("originTitle", { count: data.branches.length })}
            </Eyebrow>
            <p className="text-sm text-muted-foreground">{t("originHint")}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {branches.map((branch) => (
              <BranchCard
                key={branch.rootId}
                branch={branch}
                joins={
                  data.branches.find((b) => b.rootId === branch.joinsRootId)
                    ?.surname ?? null
                }
                placeById={placeById}
                onSelect={() =>
                  setFocus({ kind: "branch", rootId: branch.rootId })
                }
                onPreview={(on) => setHoveredBranch(on ? branch.rootId : null)}
              />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setAllBranches(true)}
              className="w-fit cursor-pointer text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("moreBranches", { count: hidden })}
            </button>
          )}
        </section>
      )}

      <NowPlaces state={state} />

      {data.gaps && <GapsBox gaps={data.gaps} state={state} />}
    </>
  );
}
