"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { pathOf } from "@/domain/place/map-snapshot";
import { BackButton, MapAvatar } from "./panel-bits";
import { personYears } from "./person-years";
import type { FamilyMapState } from "../use-family-map";

const PILL =
  "flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors duration-base ease-(--ease-reveal) outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** One person's way through the world: numbered stops (the same numbers
 *  the map's pins carry) and a way back to their branch and profile. */
export function PersonPanel({
  state,
  personId,
}: {
  state: FamilyMapState;
  personId: string;
}) {
  const t = useTranslations("familyMap");
  const { data, familyId, familySlug, setFocus } = state;
  const person = data.people[personId];
  if (!person) return null;
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  const { placeIds } = pathOf(data.model, new Set([personId]));
  const stays = data.model.stays.filter((s) => s.personId === personId);
  const countries = new Set(
    placeIds
      .map((id) => placeById.get(id)?.country?.trim().toLowerCase())
      .filter(Boolean),
  );
  const branch = data.branches.find((b) => b.memberIds.includes(personId));
  const meta = [
    personYears(person, t),
    placeIds.length > 0
      ? t("personPathMeta", {
          places: placeIds.length,
          countries: countries.size,
        })
      : null,
  ].filter(Boolean);

  return (
    <>
      <BackButton onClick={() => setFocus({ kind: "overview" })} />
      <header className="-mt-1 flex items-center gap-3.5">
        <MapAvatar person={person} familyId={familyId} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-heading text-2xl leading-tight font-medium">
            {person.name}
          </h2>
          {meta.length > 0 && (
            <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
          )}
        </div>
      </header>

      {stays.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("personNoPath")}</p>
      ) : (
        <ol className="flex flex-col">
          {stays.map((stay) => (
            <li
              key={`${stay.placeId}-${stay.from}`}
              className="flex min-h-12 items-center gap-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                {placeIds.indexOf(stay.placeId) + 1}
              </span>
              <span className="w-10 shrink-0 text-sm text-muted-foreground tabular-nums">
                {stay.entry === "residence" ? "" : stay.from}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {placeById.get(stay.placeId)?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`entry.${stay.entry}`)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={`/families/${familySlug}/people/${person.slug}`}
          className={`${PILL} border border-border hover:bg-foreground/6`}
        >
          {t("openProfile")}
        </Link>
        {branch?.surname && (
          <button
            type="button"
            onClick={() => setFocus({ kind: "branch", rootId: branch.rootId })}
            className={`${PILL} cursor-pointer text-muted-foreground hover:text-foreground`}
          >
            {t("branchLink", { surname: branch.surname })}
          </button>
        )}
      </div>
    </>
  );
}
