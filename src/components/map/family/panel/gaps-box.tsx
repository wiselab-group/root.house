"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import type { MapGaps } from "@/domain/place/place-map.service";
import { Eyebrow } from "./panel-bits";
import type { FamilyMapState } from "../use-family-map";

const ROW =
  "-mx-1 flex min-h-9 w-[calc(100%+0.5rem)] cursor-pointer items-center gap-2 rounded-lg px-1 text-left text-sm transition-colors duration-base ease-(--ease-reveal) outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring";

/** What keeps the map from being whole — editors only (the page passes
 *  `gaps: null` to everyone else), and never drawn on the map itself. */
export function GapsBox({
  gaps,
  state,
}: {
  gaps: MapGaps;
  state: FamilyMapState;
}) {
  const t = useTranslations("familyMap");
  const total =
    gaps.placesWithoutPoint + gaps.peopleWithoutBirthplace + gaps.undatedStops;
  if (total === 0) return null;
  return (
    <section className="mt-auto flex flex-col gap-1 rounded-2xl bg-foreground/5 px-3.5 py-3">
      <Eyebrow className="mb-1">{t("gapsTitle")}</Eyebrow>
      <ul>
        {gaps.placesWithoutPoint > 0 && (
          <li>
            <button
              type="button"
              className={ROW}
              onClick={() => state.setFocus({ kind: "search" })}
            >
              <span className="flex-1">
                {t("gapPlaces", { count: gaps.placesWithoutPoint })}
              </span>
              <ChevronRightIcon
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
            </button>
          </li>
        )}
        {gaps.peopleWithoutBirthplace > 0 && (
          <li>
            <Link href={`/families/${state.familySlug}/people`} className={ROW}>
              <span className="flex-1">
                {t("gapBirthplace", { count: gaps.peopleWithoutBirthplace })}
              </span>
              <ChevronRightIcon
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
            </Link>
          </li>
        )}
        {gaps.undatedStops > 0 && (
          <li className="flex min-h-9 items-center text-sm text-muted-foreground">
            {t("gapUndated", { count: gaps.undatedStops })}
          </li>
        )}
      </ul>
    </section>
  );
}
