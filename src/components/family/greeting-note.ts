import {
  anniversariesOn,
  type AnniversaryKind,
  type CalendarDay,
} from "@/domain/family/anniversaries";
import { personDisplayName } from "@/domain/person/display-name";
import type { PersonRecord } from "@/domain/person/person.service";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";
import type { StoryRecord } from "@/domain/story/story.service";
import type { Locale } from "@/domain/shared/locale";

/**
 * The one personal thing Family Home's greeting line says after «Добрый
 * вечер, Александр · » — the most relevant first (user-approved priority,
 * 2026-10-01): a memorable date today → this user's unfinished draft →
 * what the family added this week. One note, never a list: the line stays
 * a quiet single line.
 */
export type GreetingNote =
  | {
      kind: "anniversary";
      anniversary: AnniversaryKind;
      /** Rendered joined with «и» — two for a wedding. */
      names: string[];
      years: number | null;
      href: string;
      /** Other anniversaries today, not shown. */
      more: number;
    }
  | { kind: "draft"; title: string | null; href: string }
  | { kind: "week"; photos: number; stories: number };

export function greetingNote({
  today,
  locale,
  familySlug,
  people,
  partnerships,
  drafts,
  weekPhotos,
  weekStories,
}: {
  today: CalendarDay;
  locale: Locale;
  familySlug: string;
  /** Already privacy-filtered. */
  people: PersonRecord[];
  partnerships: PartnershipRecord[];
  /** This user's own drafts, most recently edited first. */
  drafts: StoryRecord[];
  weekPhotos: number;
  weekStories: number;
}): GreetingNote | null {
  const [first, ...rest] = anniversariesOn(today, people, partnerships);
  if (first) {
    const byId = new Map(people.map((person) => [person.id, person]));
    const persons = first.personIds
      .map((id) => byId.get(id))
      .filter((person): person is PersonRecord => person !== undefined);
    return {
      kind: "anniversary",
      anniversary: first.kind,
      names: coupleNames(persons, locale),
      years: first.years,
      href: `/families/${familySlug}/people/${persons[0].slug}`,
      more: rest.length,
    };
  }

  const draft = drafts.find((d) => d.title !== "" || d.body !== "");
  if (draft) {
    return {
      kind: "draft",
      title: draft.title || null,
      href: `/families/${familySlug}/stories/${draft.slug}/edit`,
    };
  }

  if (weekPhotos > 0 || weekStories > 0) {
    return { kind: "week", photos: weekPhotos, stories: weekStories };
  }
  return null;
}

/** «Виктор», «Галина Купчик» for a couple sharing a surname (read as
 *  «Виктор и Галина Купчик»); full names otherwise. */
function coupleNames(persons: PersonRecord[], locale: Locale): string[] {
  const [a, b] = persons;
  if (
    b &&
    a.firstName &&
    b.firstName &&
    a.lastName &&
    a.lastName === b.lastName
  ) {
    return [a.firstName, personDisplayName(b, locale)];
  }
  return persons.map((person) => personDisplayName(person, locale));
}
