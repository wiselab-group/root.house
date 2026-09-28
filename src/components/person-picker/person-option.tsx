"use client";

import { useLocale } from "next-intl";
import { Combobox } from "@base-ui/react/combobox";
import { PersonThumb } from "@/components/person/person-thumb";
import { personDisplayName } from "@/domain/person/display-name";
import { formatLifeYears } from "@/domain/shared/partial-date";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * One person in any picker's results — the same row everywhere, built to
 * tell namesakes apart: their portrait (or initials), the name, the maiden
 * name when it differs (search matches on it too, so a hit found only
 * through it would otherwise look wrong), and life years.
 */
export function PersonOption({
  person,
  familyId,
}: {
  person: PersonSearchResult;
  familyId: string;
}) {
  const locale = useLocale();
  const years = formatLifeYears(person.birthDate, person.deathDate, locale);
  const hasMaidenName =
    person.maidenName && person.maidenName !== person.lastName;

  return (
    <Combobox.Item
      value={person}
      className="flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
    >
      <PersonThumb person={person} familyId={familyId} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">
          {personDisplayName(person, locale)}
          {hasMaidenName && (
            <span className="font-normal text-muted-foreground">
              {" "}
              ({person.maidenName})
            </span>
          )}
        </span>
        {years && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {years}
          </span>
        )}
      </span>
    </Combobox.Item>
  );
}
