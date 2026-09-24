import type { EventRecord } from "./event.repository";

export interface LifelinePoint<T extends EventRecord = EventRecord> {
  /** First event's id — stable React key and selection id. */
  id: string;
  year: number;
  /** Horizontal position on the axis, in percent (kept off the very edges
   *  so the end dots aren't clipped). */
  position: number;
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
  decades: { year: number; position: number }[];
}

const EDGE = 0.7;

/**
 * The horizontal «Линия жизни» scale from the profile mock (variant 03):
 * birth → death (or → `currentYear` for the living), every dated event a
 * dot on it. Events sharing a year collapse into one dot — two dots on the
 * same x would just overlap. Undated events stay in the list below only.
 * Null when fewer than two points could be placed — a single dot on an
 * axis says nothing the list doesn't.
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
  const span = Math.max(endYear - startYear, 1);
  const position = (year: number) =>
    Math.min(100 - EDGE, Math.max(EDGE, ((year - startYear) / span) * 100));

  const decades: Lifeline<T>["decades"] = [];
  for (let year = Math.ceil(startYear / 10) * 10; year < endYear; year += 10) {
    if (year > startYear) decades.push({ year, position: position(year) });
  }

  return {
    startYear,
    endYear,
    decades,
    points: years.map((year, index) => ({
      id: byYear.get(year)![0].id,
      year,
      position: position(year),
      side: index % 2 === 0 ? "up" : "down",
      events: byYear.get(year)!,
    })),
  };
}

/** «ему 26» / «ей 26» / «26 лет» — the person's age in the event card. */
export function ageAt(
  year: number,
  birthYear: number | null,
  gender: "male" | "female" | "unknown",
): string | null {
  if (birthYear == null || year <= birthYear) return null;
  const age = year - birthYear;
  if (gender === "male") return `ему ${age}`;
  if (gender === "female") return `ей ${age}`;
  return `${age} ${yearsWord(age)}`;
}

function yearsWord(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return "лет";
  if (mod10 === 1) return "год";
  if (mod10 >= 2 && mod10 <= 4) return "года";
  return "лет";
}
