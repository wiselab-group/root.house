"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
import type { MapPlace } from "@/domain/place/place-map.service";
import { Eyebrow, PersonRow } from "./panel-bits";
import { SearchField } from "./search-field";
import { SearchPlaceRow } from "./search-place-row";
import type { FamilyMapState } from "../use-family-map";

const PEOPLE_SHOWN = 8;

/** The search field opened: every place of the family (user ask: the full
 *  list on demand, not on the overview), and people once something is typed. */
export function SearchPanel({ state }: { state: FamilyMapState }) {
  const t = useTranslations("familyMap");
  const { data, familyId, canEdit, setFocus } = state;
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase();

  const peopleAt = useMemo(() => {
    const byPlace = new Map<string, Set<string>>();
    for (const s of data.model.stops) {
      if (!s.personId) continue;
      byPlace.set(
        s.placeId,
        (byPlace.get(s.placeId) ?? new Set()).add(s.personId),
      );
    }
    return byPlace;
  }, [data.model.stops]);

  const places = data.places.filter(
    (p) => !q || p.name.toLocaleLowerCase().includes(q),
  );
  const people = q
    ? Object.values(data.people).filter((p) =>
        p.name.toLocaleLowerCase().includes(q),
      )
    : [];
  const unplaced = places.filter(
    (p) => p.latitude == null || p.longitude == null,
  );
  const byCountry = new Map<string, MapPlace[]>();
  for (const p of places) {
    if (p.latitude == null || p.longitude == null) continue;
    const key = p.country?.trim() || t("noCountry");
    byCountry.set(key, [...(byCountry.get(key) ?? []), p]);
  }
  const row = (place: MapPlace) => (
    <SearchPlaceRow
      key={place.id}
      place={place}
      peopleCount={peopleAt.get(place.id)?.size ?? 0}
      canEdit={canEdit}
      onSelect={() => setFocus({ kind: "place", placeId: place.id })}
      onEdit={() => setFocus({ kind: "editPlace", placeId: place.id })}
    />
  );

  return (
    <>
      <SearchField
        query={query}
        onQuery={setQuery}
        onCancel={() => setFocus({ kind: "overview" })}
      />

      {!q && (
        <p className="-mt-2 text-sm text-muted-foreground">{t("searchHint")}</p>
      )}

      {people.length > 0 && (
        <section>
          <Eyebrow className="mb-1">{t("peopleTitle")}</Eyebrow>
          <ul>
            {people.slice(0, PEOPLE_SHOWN).map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                familyId={familyId}
                onSelect={() => setFocus({ kind: "person", personId: p.id })}
              />
            ))}
          </ul>
        </section>
      )}

      {unplaced.length > 0 && (
        <section className="rounded-2xl bg-primary/8 px-3.5 py-2.5">
          <Eyebrow className="mb-1">
            {t("notOnMapTitle", { count: unplaced.length })}
          </Eyebrow>
          <ul>{unplaced.map(row)}</ul>
        </section>
      )}

      {[...byCountry.entries()].map(([country, list]) => (
        <section key={country}>
          <Eyebrow className="mb-1">{country}</Eyebrow>
          <ul>{list.map(row)}</ul>
        </section>
      ))}

      {q && people.length === 0 && places.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => setFocus({ kind: "editPlace", placeId: null })}
          className="mt-auto flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-base ease-(--ease-spring) outline-none hover:scale-[1.02] focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <PlusIcon className="size-4" aria-hidden />
          {t("addPlace")}
        </button>
      )}
    </>
  );
}
