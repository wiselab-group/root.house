/**
 * PartialDate — represents a date that may be incomplete or approximate.
 *
 * Genealogical dates are frequently not fully known: only a year, only a decade,
 * or nothing at all beyond "he was born sometime before the war". Rather than
 * modeling this as a nullable single `Date` column (which forces an all-or-nothing
 * choice), we store year/month/day independently plus a precision marker.
 *
 * This module is the ONLY place that should assemble/disassemble the raw
 * `*_year`/`*_month`/`*_day` columns used by persons/events tables — repositories
 * must go through here rather than touching those columns directly.
 */

export type DatePrecision = "exact" | "year_only" | "decade" | "unknown";

export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
  precision: DatePrecision;
  isApproximate: boolean;
}

/** Column shape as stored in Postgres (Drizzle-inferred row shape for a date group). */
export interface PartialDateColumns {
  year: number | null;
  month: number | null;
  day: number | null;
  precision: string | null;
  approximate: boolean | null;
}

export const UNKNOWN_DATE: PartialDate = {
  year: null,
  month: null,
  day: null,
  precision: "unknown",
  isApproximate: false,
};

export function fromColumns(columns: PartialDateColumns): PartialDate | null {
  if (columns.year === null && columns.precision === null) return null;
  return {
    year: columns.year,
    month: columns.month,
    day: columns.day,
    precision: (columns.precision as DatePrecision) ?? "unknown",
    isApproximate: columns.approximate ?? false,
  };
}

export function toColumns(date: PartialDate | null): PartialDateColumns {
  if (!date) {
    return {
      year: null,
      month: null,
      day: null,
      precision: null,
      approximate: null,
    };
  }
  return {
    year: date.year,
    month: date.month,
    day: date.day,
    precision: date.precision,
    approximate: date.isApproximate,
  };
}

const MONTH_NAMES = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Human-readable Russian formatting used across Person/Event UI. */
export function formatPartialDate(
  date: PartialDate | null | undefined,
): string {
  if (!date || date.precision === "unknown" || date.year === null)
    return "неизвестно";

  const approxPrefix = date.isApproximate ? "около " : "";

  if (date.precision === "decade") {
    const decadeStart = Math.floor(date.year / 10) * 10;
    return `${approxPrefix}${decadeStart}-е гг.`;
  }

  if (date.precision === "year_only" || date.month === null) {
    return `${approxPrefix}${date.year} г.`;
  }

  if (date.day === null) {
    return `${approxPrefix}${MONTH_NAMES[date.month - 1]} ${date.year} г.`;
  }

  return `${approxPrefix}${date.day} ${MONTH_NAMES[date.month - 1]} ${date.year} г.`;
}

/**
 * Sort-friendly numeric key. Unknown dates sort last (Infinity) so timeline
 * views don't have to special-case them at the call site.
 */
export function toSortableValue(date: PartialDate | null | undefined): number {
  if (!date || date.year === null) return Number.POSITIVE_INFINITY;
  const month = date.month ?? 1;
  const day = date.day ?? 1;
  return date.year * 10000 + month * 100 + day;
}

export function comparePartialDates(
  a: PartialDate | null,
  b: PartialDate | null,
): number {
  return toSortableValue(a) - toSortableValue(b);
}

/**
 * Parses a PartialDate out of a submitted <form>'s FormData, given a field
 * name prefix (e.g. "birth" reads birthYear/birthMonth/birthDay/birthApproximate).
 * Shared by every Server Action that accepts a date field (person.actions.ts's
 * birth/death dates, event.actions.ts's date/endDate) instead of each
 * reimplementing the same parsing — precision is inferred from how much of
 * the date was actually filled in (day present -> exact, else month present
 * -> exact, else year-only).
 */
export function partialDateFromFormData(
  formData: FormData,
  prefix: string,
): PartialDate | undefined {
  const yearRaw = formData.get(`${prefix}Year`);
  if (!yearRaw || yearRaw === "") return undefined;

  const year = Number(yearRaw);
  const monthRaw = formData.get(`${prefix}Month`);
  const dayRaw = formData.get(`${prefix}Day`);
  const isApproximate = formData.get(`${prefix}Approximate`) === "on";

  const month = monthRaw && monthRaw !== "" ? Number(monthRaw) : null;
  const day = dayRaw && dayRaw !== "" ? Number(dayRaw) : null;

  return {
    year,
    month,
    day,
    precision: day ? "exact" : month ? "exact" : "year_only",
    isApproximate,
  };
}
