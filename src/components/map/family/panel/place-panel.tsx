"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PencilIcon } from "lucide-react";
import { placeStory } from "@/domain/place/place-story";
import { BackButton, PersonRow } from "./panel-bits";
import { EventMoments, PersonMoments, PlaceGroup } from "./place-groups";
import type { FamilyMapState } from "../use-family-map";

/** A place told by meaning: who was born, lived, married, died here, and
 *  what else happened — the user's «Place → Person/Event → meaning». */
export function PlacePanel({
  state,
  placeId,
}: {
  state: FamilyMapState;
  placeId: string;
}) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("counts");
  const { data, familyId, setFocus } = state;
  const place = data.places.find((p) => p.id === placeId);
  if (!place) return null;
  const story = placeStory(data.model, placeId);
  const location = [place.region, place.country].filter(Boolean).join(", ");
  const sub = [
    location,
    story.since !== null ? t("familyHereSince", { year: story.since }) : null,
    story.personIds.length > 0
      ? tc("people", { count: story.personIds.length })
      : null,
  ].filter(Boolean);
  const empty =
    story.births.length +
      story.lives.length +
      story.marriages.length +
      story.deaths.length +
      story.events.length ===
    0;

  return (
    <>
      <BackButton onClick={() => setFocus({ kind: "overview" })} />
      <header className="-mt-2 flex flex-col gap-1">
        <h2 className="font-heading text-[1.75rem] leading-tight font-medium">
          {place.name}
        </h2>
        {sub.length > 0 && (
          <p className="text-sm text-muted-foreground">{sub.join(" · ")}</p>
        )}
      </header>

      {empty && (
        <p className="text-sm text-muted-foreground">{t("placeEmpty")}</p>
      )}

      <PlaceGroup title={t("groupLived")} show={story.lives.length > 0}>
        {story.lives.map((life) => {
          const person = data.people[life.personId];
          if (!person) return null;
          const aside = !life.fromKnown
            ? t("livesNow")
            : life.to === null
              ? t("sinceYear", { year: life.from })
              : t("yearRange", { from: life.from, to: life.to });
          return (
            <PersonRow
              key={`${life.personId}-${life.from}`}
              person={person}
              familyId={familyId}
              aside={aside}
              onSelect={() => setFocus({ kind: "person", personId: person.id })}
            />
          );
        })}
      </PlaceGroup>
      <PersonMoments
        title={t("groupBorn")}
        moments={story.births}
        state={state}
      />
      <EventMoments
        title={t("groupMarried")}
        moments={story.marriages}
        state={state}
      />
      <EventMoments
        title={t("groupEvents")}
        moments={story.events}
        state={state}
      />
      <PersonMoments
        title={t("groupDied")}
        moments={story.deaths}
        state={state}
      />

      {state.canEdit && (
        <Link
          href={`/families/${state.familySlug}/places`}
          className="mt-auto flex h-10 w-fit items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PencilIcon className="size-3.5" aria-hidden />
          {t("editPlace")}
        </Link>
      )}
    </>
  );
}
