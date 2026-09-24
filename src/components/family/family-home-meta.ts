import { CalendarIcon, ImagesIcon, MapPinIcon, UsersIcon } from "lucide-react";
import {
  personCountLabel,
  photoCountLabel,
  placeCountLabel,
} from "@/domain/shared/pluralize-ru";
import type { HeroMetaItem } from "@/components/hero/hero-meta";
import type { PersonRecord } from "@/domain/person/person.service";

/**
 * "Family at a glance" line under the Family Home hero title — the same
 * icon + text meta row as the profile's dates/place. Only counts the page
 * already has (people, places, visible photos) plus the earliest known
 * birth year among visible people («с 1885 г.» — how far back the archive
 * reaches). Still no «поколений» figure: that needs the tree layout engine
 * run from a focus person, and the brief forbids fabricated statistics
 * (docs/PRODUCT-REFACTOR.md §46). Zero counts are omitted, never «0 фото».
 */
export function familyHomeMeta({
  personCount,
  placeCount,
  photoCount,
  earliestYear,
}: {
  personCount: number;
  placeCount: number;
  photoCount: number;
  earliestYear: number | null;
}): HeroMetaItem[] {
  const items: HeroMetaItem[] = [];
  if (personCount > 0)
    items.push({ Icon: UsersIcon, label: personCountLabel(personCount) });
  if (earliestYear != null)
    items.push({ Icon: CalendarIcon, label: `с ${earliestYear} г.` });
  if (placeCount > 0)
    items.push({ Icon: MapPinIcon, label: placeCountLabel(placeCount) });
  if (photoCount > 0)
    items.push({ Icon: ImagesIcon, label: photoCountLabel(photoCount) });
  return items;
}

/** Earliest known birth year among the (already privacy-filtered)
 *  people — «с 1885 г.», how far back the archive reaches. */
export function earliestBirthYear(people: PersonRecord[]): number | null {
  const years = people
    .map((person) => person.birthDate?.year)
    .filter((year): year is number => year != null);
  return years.length > 0 ? Math.min(...years) : null;
}
