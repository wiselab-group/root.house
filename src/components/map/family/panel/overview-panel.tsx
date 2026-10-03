"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { currentPlaces, snapshotAt } from "@/domain/place/map-snapshot";
import { BranchCard } from "./branch-card";
import { Eyebrow } from "./panel-bits";
import { StatsLine } from "./stats-line";
import { GapsBox } from "./gaps-box";
import type { FamilyMapState } from "../use-family-map";

const SHOWN_BRANCHES = 3;

/** The map's front page: where we come from (branches), where we are now,
 *  and — for editors — what the map is still missing. */
export function OverviewPanel({
  state,
  invite,
}: {
  state: FamilyMapState;
  /** The «▶ how we got here» call, placed here on touch screens. */
  invite: React.ReactNode;
}) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("counts");
  const { data, setFocus, setHoveredBranch } = state;
  const [allBranches, setAllBranches] = useState(false);
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  const now = currentPlaces(data.model);
  const branches = allBranches
    ? data.branches
    : data.branches.slice(0, SHOWN_BRANCHES);
  const hidden = data.branches.length - branches.length;

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium">{t("title")}</h1>
        <StatsLine stats={snapshotAt(data.model, "all").stats} />
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

      {invite}

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

      {now.length > 0 && (
        <section className="flex flex-col gap-1">
          <Eyebrow className="mb-1">{t("nowTitle")}</Eyebrow>
          <ul>
            {now.map(({ placeId, personIds }) => (
              <li key={placeId}>
                <button
                  type="button"
                  onClick={() => setFocus({ kind: "place", placeId })}
                  className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 text-left transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full bg-tree-accent"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {placeById.get(placeId)?.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tc("people", { count: personIds.length })}
                  </span>
                  <ChevronRightIcon
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.gaps && <GapsBox gaps={data.gaps} state={state} />}
    </>
  );
}
