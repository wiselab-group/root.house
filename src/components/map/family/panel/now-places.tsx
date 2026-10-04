"use client";

import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import { currentPlaces } from "@/domain/place/map-snapshot";
import { Eyebrow } from "./panel-bits";
import type { FamilyMapState } from "../use-family-map";

/** «Где семья сейчас» — the places the living family is in today. */
export function NowPlaces({ state }: { state: FamilyMapState }) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("counts");
  const { data, setFocus } = state;
  const now = currentPlaces(data.model);
  if (now.length === 0) return null;
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  return (
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
  );
}
