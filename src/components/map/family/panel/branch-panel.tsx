"use client";

import { useTranslations } from "next-intl";
import { BackButton, Eyebrow, PersonRow } from "./panel-bits";
import { personYears } from "./person-years";
import type { FamilyMapState } from "../use-family-map";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** One root branch: its generations top-down, each person with the places
 *  they lived — the branch's path is lit on the map meanwhile. */
export function BranchPanel({
  state,
  rootId,
}: {
  state: FamilyMapState;
  rootId: string;
}) {
  const t = useTranslations("familyMap");
  const { data, familyId, setFocus, branchById } = state;
  const branch = branchById.get(rootId);
  if (!branch) return null;
  const placeName = (id: string) => data.places.find((p) => p.id === id)?.name;
  const origin = placeName(branch.originPlaceId) ?? "";
  const base = Math.min(
    ...branch.memberIds.map((id) => data.model.generations[id] ?? 0),
  );

  const members = branch.memberIds
    .map((id) => data.people[id])
    .filter((p) => p !== undefined)
    .sort(
      (a, b) =>
        (data.model.generations[a.id] ?? 0) -
          (data.model.generations[b.id] ?? 0) ||
        (a.birthYear ?? Infinity) - (b.birthYear ?? Infinity),
    );
  const pathOfPerson = (id: string) => {
    const seen: string[] = [];
    for (const s of data.model.stays) {
      if (s.personId === id && !seen.includes(s.placeId)) seen.push(s.placeId);
    }
    return seen.map(placeName).filter(Boolean).join(" → ");
  };

  return (
    <>
      <BackButton onClick={() => setFocus({ kind: "overview" })} />
      <header className="-mt-2 flex flex-col gap-1">
        <Eyebrow>{t("branchEyebrow")}</Eyebrow>
        <h2 className="font-heading text-[1.75rem] leading-tight font-medium">
          {branch.surname ?? t("branchUnnamed")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {branch.since !== null
            ? t("branchOrigin", { place: origin, year: branch.since })
            : origin}
          {" · "}
          {t("branchMeta", {
            generations: branch.generations,
            people: branch.memberIds.length,
          })}
        </p>
      </header>
      <ol className="flex flex-col">
        {members.map((person) => {
          const rank = (data.model.generations[person.id] ?? 0) - base;
          return (
            <PersonRow
              key={person.id}
              person={person}
              familyId={familyId}
              leading={
                <span
                  aria-label={t("generationN", { n: rank + 1 })}
                  className="w-5 shrink-0 text-center font-heading text-xs text-muted-foreground"
                >
                  {ROMAN[rank] ?? rank + 1}
                </span>
              }
              sub={[personYears(person, t), pathOfPerson(person.id)]
                .filter(Boolean)
                .join(" · ")}
              onSelect={() => setFocus({ kind: "person", personId: person.id })}
            />
          );
        })}
      </ol>
    </>
  );
}
