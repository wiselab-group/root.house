import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * Memorable dates falling on a given calendar day — Family Home's greeting
 * line («сегодня день рождения — Елена Ушкар, 38 лет»). Structure only:
 * which kind, whose, how many years; the UI words it (CLAUDE.md I18N).
 *
 * - birthday: a living person's birth date;
 * - birth: a deceased person's birth date («130 лет со дня рождения»),
 *   only with a known year — without one there's nothing to say;
 * - wedding: a married/widowed couple's partnership start date (not a
 *   divorced or separated couple's, nor an unmarried partnership's);
 * - memory: a deceased person's death date.
 *
 * Only exact, non-approximate dates count: «около 1885» or a month without
 * a day can't land on a particular day.
 */
export type AnniversaryKind = "birthday" | "wedding" | "birth" | "memory";

export interface Anniversary {
  kind: AnniversaryKind;
  /** One person, or the two partners for a wedding. */
  personIds: string[];
  /** Years since the date, when its year is known. */
  years: number | null;
}

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

interface PersonDates {
  id: string;
  isLiving: boolean;
  birthDate: PartialDate | null;
  deathDate: PartialDate | null;
}

interface PartnershipDates {
  person1Id: string;
  person2Id: string;
  status: "married" | "divorced" | "widowed" | "partnered" | "separated";
  startDate: PartialDate | null;
}

const KIND_ORDER: AnniversaryKind[] = [
  "birthday",
  "wedding",
  "birth",
  "memory",
];
const WEDDING_STATUSES = new Set(["married", "widowed"]);

/** Years since `date` if it falls on `today` (null year → null years);
 *  undefined when it doesn't fall on today at all. */
function yearsIfToday(
  date: PartialDate | null,
  today: CalendarDay,
): number | null | undefined {
  if (!date || date.isApproximate) return undefined;
  if (date.month !== today.month || date.day !== today.day) return undefined;
  if (date.year == null) return null;
  const years = today.year - date.year;
  return years > 0 ? years : undefined;
}

/**
 * Every anniversary on `today` among `people` and `partnerships` — both
 * already privacy-filtered by the caller; a partnership counts only when
 * both partners are among `people`. Ordered birthday → wedding → birth →
 * memory, then by more years first.
 */
export function anniversariesOn(
  today: CalendarDay,
  people: PersonDates[],
  partnerships: PartnershipDates[],
): Anniversary[] {
  const found: Anniversary[] = [];
  const visible = new Set(people.map((person) => person.id));

  for (const person of people) {
    const birthYears = yearsIfToday(person.birthDate, today);
    if (birthYears !== undefined) {
      if (person.isLiving) {
        found.push({
          kind: "birthday",
          personIds: [person.id],
          years: birthYears,
        });
      } else if (birthYears !== null) {
        found.push({
          kind: "birth",
          personIds: [person.id],
          years: birthYears,
        });
      }
    }
    if (!person.isLiving) {
      const deathYears = yearsIfToday(person.deathDate, today);
      if (deathYears !== undefined) {
        found.push({
          kind: "memory",
          personIds: [person.id],
          years: deathYears,
        });
      }
    }
  }

  for (const partnership of partnerships) {
    if (!WEDDING_STATUSES.has(partnership.status)) continue;
    if (
      !visible.has(partnership.person1Id) ||
      !visible.has(partnership.person2Id)
    )
      continue;
    const years = yearsIfToday(partnership.startDate, today);
    if (years === undefined) continue;
    found.push({
      kind: "wedding",
      personIds: [partnership.person1Id, partnership.person2Id],
      years,
    });
  }

  return found.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      (b.years ?? 0) - (a.years ?? 0),
  );
}
