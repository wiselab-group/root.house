"use client";

import { useTranslations } from "next-intl";
import type { PlaceMoment } from "@/domain/place/place-story";
import { Eyebrow, PersonRow } from "./panel-bits";
import type { FamilyMapState } from "../use-family-map";

/** One meaning-group of a place sheet («Жили», «Родились», …) — hidden when empty. */
export function PlaceGroup({
  title,
  show,
  children,
}: {
  title: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <section className="flex flex-col gap-1">
      <Eyebrow className="mb-1">{title}</Eyebrow>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

/** One person per moment (a birth, a death): their row with the year. */
export function PersonMoments({
  title,
  moments,
  state,
}: {
  title: string;
  moments: PlaceMoment[];
  state: FamilyMapState;
}) {
  return (
    <PlaceGroup title={title} show={moments.length > 0}>
      {moments.map((m) => {
        const person = state.data.people[m.personIds[0]];
        if (!person) return null;
        return (
          <PersonRow
            key={person.id}
            person={person}
            familyId={state.familyId}
            aside={m.year?.toString()}
            onSelect={() =>
              state.setFocus({ kind: "person", personId: person.id })
            }
          />
        );
      })}
    </PlaceGroup>
  );
}

/** Events that may hold several people (a wedding) or none (a gathering):
 *  who took part as the title, what it was underneath. */
export function EventMoments({
  title,
  moments,
  state,
}: {
  title: string;
  moments: PlaceMoment[];
  state: FamilyMapState;
}) {
  const tTypes = useTranslations("eventTypes");
  const { data } = state;
  return (
    <PlaceGroup title={title} show={moments.length > 0}>
      {moments.map((m) => {
        const names = m.personIds
          .map((id) => data.people[id]?.firstName)
          .filter(Boolean)
          .join(", ");
        const event = m.eventId ? data.events[m.eventId] : undefined;
        const what = event?.title || (m.eventType ? tTypes(m.eventType) : "");
        return (
          <li
            key={m.eventId}
            className="flex min-h-10 items-center gap-3 text-sm"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{names || what}</span>
              {names && what && (
                <span className="truncate text-xs text-muted-foreground">
                  {what}
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {m.year}
            </span>
          </li>
        );
      })}
    </PlaceGroup>
  );
}
