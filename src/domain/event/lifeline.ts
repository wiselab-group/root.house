import type { EventRecord } from "./event.repository";
import type { PartialDate } from "@/domain/shared/partial-date";

export interface LifelinePoint<T extends EventRecord = EventRecord> {
  /** First event's id — stable React key and selection id. */
  id: string;
  year: number;
  /** Alternates above/below the axis so neighbouring labels don't collide. */
  side: "up" | "down";
  /** Every event that fell on this year, in timeline order. */
  events: T[];
}

export interface Lifeline<T extends EventRecord = EventRecord> {
  startYear: number;
  endYear: number;
  points: LifelinePoint<T>[];
  /** Round decades inside the span, for the faint year ticks under the axis. */
  decades: number[];
}

/**
 * The horizontal «Линия жизни» scale from the profile mock (variant 03):
 * birth → death (or → `currentYear` for the living), every dated event a
 * dot on it. Events sharing a year collapse into one dot — two dots on the
 * same x would just overlap. Undated events stay in the list below only.
 * Null when fewer than two points could be placed — a single dot on an
 * axis says nothing the list doesn't. Years only — where they land in px
 * depends on the labels' widths, see lifeline-scale.ts.
 */
export function buildLifeline<T extends EventRecord>(
  timeline: T[],
  { isLiving, currentYear }: { isLiving: boolean; currentYear: number },
): Lifeline<T> | null {
  const byYear = new Map<number, T[]>();
  for (const event of timeline) {
    const year = event.date?.year;
    if (year == null) continue;
    byYear.set(year, [...(byYear.get(year) ?? []), event]);
  }
  if (byYear.size < 2) return null;

  const years = [...byYear.keys()].sort((a, b) => a - b);
  const startYear = years[0];
  const lastYear = years[years.length - 1];
  const endYear = isLiving ? Math.max(lastYear, currentYear) : lastYear;

  const decades: number[] = [];
  for (let year = Math.ceil(startYear / 10) * 10; year < endYear; year += 10) {
    if (year > startYear) decades.push(year);
  }

  return {
    startYear,
    endYear,
    decades,
    points: years.map((year, index) => ({
      id: byYear.get(year)![0].id,
      year,
      side: index % 2 === 0 ? "up" : "down",
      events: byYear.get(year)!,
    })),
  };
}

/**
 * «ему 26» / «ей 26» / «26 лет» — the person's age in the event card.
 *
 * Exact when both dates are complete enough to tell whether the birthday
 * had already come that year (month, and day when the months match) —
 * otherwise, or when either date is approximate, the plain year difference,
 * which can run a year high.
 */
export function ageAt(
  at: PartialDate | null,
  birth: PartialDate | null,
  gender: "male" | "female" | "unknown",
): string | null {
  const age = yearsBetween(birth, at);
  if (age === null || age <= 0) return null;
  if (gender === "male") return `ему ${age}`;
  if (gender === "female") return `ей ${age}`;
  return `${age} ${yearsWord(age)}`;
}

function yearsBetween(
  birth: PartialDate | null,
  at: PartialDate | null,
): number | null {
  if (birth?.year == null || at?.year == null) return null;
  const years = at.year - birth.year;
  if (birth.isApproximate || at.isApproximate) return years;
  if (birth.month == null || at.month == null) return years;
  if (at.month !== birth.month) {
    return at.month < birth.month ? years - 1 : years;
  }
  if (birth.day == null || at.day == null) return years;
  return at.day < birth.day ? years - 1 : years;
}

function yearsWord(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return "лет";
  if (mod10 === 1) return "год";
  if (mod10 >= 2 && mod10 <= 4) return "года";
  return "лет";
}
