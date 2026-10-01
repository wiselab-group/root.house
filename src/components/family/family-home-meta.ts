import {
  BookOpenIcon,
  CalendarIcon,
  ImagesIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
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
 * Each count links to its section (user's pick 2026-10-01); «с 1885 г.»
 * has nowhere to lead and stays plain.
 */
export async function familyHomeMeta({
  familySlug,
  personCount,
  placeCount,
  photoCount,
  storyCount,
  earliestYear,
}: {
  familySlug: string;
  personCount: number;
  placeCount: number;
  photoCount: number;
  storyCount: number;
  earliestYear: number | null;
}): Promise<HeroMetaItem[]> {
  const base = `/families/${familySlug}`;
  const tc = await getTranslations("counts");
  const t = await getTranslations("familyHome");
  const items: HeroMetaItem[] = [];
  if (personCount > 0)
    items.push({
      Icon: UsersIcon,
      label: tc("people", { count: personCount }),
      href: `${base}/people`,
    });
  if (earliestYear != null)
    items.push({
      Icon: CalendarIcon,
      label: t("since", { year: earliestYear }),
    });
  if (placeCount > 0)
    items.push({
      Icon: MapPinIcon,
      label: tc("places", { count: placeCount }),
      href: `${base}/map`,
    });
  if (photoCount > 0)
    items.push({
      Icon: ImagesIcon,
      label: tc("photos", { count: photoCount }),
      href: `${base}/photos`,
    });
  if (storyCount > 0)
    items.push({
      Icon: BookOpenIcon,
      label: tc("stories", { count: storyCount }),
      href: `${base}/stories`,
    });
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** How many of `dates` fall within the last seven days — the greeting's
 *  «за неделю добавлено» (a story by its publishedAt, a photo by its
 *  createdAt). */
export function addedThisWeek(dates: Date[]): number {
  const since = Date.now() - WEEK_MS;
  return dates.filter((date) => date.getTime() >= since).length;
}

/** «Александр» from «Александр Купчик» — the greeting uses the first name. */
export function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}
