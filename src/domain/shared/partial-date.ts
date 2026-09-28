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

import type { Locale } from "./locale";

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

const RU_MONTHS_GENITIVE = [
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

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Human-readable formatting used across Person/Event UI — «около 1950 г.» /
 * "c. 1950". Hand-rolled rather than Intl.DateTimeFormat: a partial date
 * (decade, month-and-year, approximate) has no Intl equivalent, and the
 * Russian month must be genitive («12 марта»).
 */
export function formatPartialDate(
  date: PartialDate | null | undefined,
  locale: Locale,
): string {
  const ru = locale === "ru";
  if (!date || date.precision === "unknown" || date.year === null)
    return ru ? "неизвестно" : "unknown";

  const approx = date.isApproximate ? (ru ? "около " : "c. ") : "";

  if (date.precision === "decade") {
    const decadeStart = Math.floor(date.year / 10) * 10;
    return ru ? `${approx}${decadeStart}-е гг.` : `${approx}${decadeStart}s`;
  }

  if (date.precision === "year_only" || date.month === null) {
    return ru ? `${approx}${date.year} г.` : `${approx}${date.year}`;
  }

  const month = (ru ? RU_MONTHS_GENITIVE : EN_MONTHS)[date.month - 1];
  if (date.day === null) {
    return ru
      ? `${approx}${month} ${date.year} г.`
      : `${approx}${month} ${date.year}`;
  }

  return ru
    ? `${approx}${date.day} ${month} ${date.year} г.`
    : `${approx}${date.day} ${month} ${date.year}`;
}

/** One end of formatLifeYears: just the year, marked when approximate
 *  («ок. 1950» / "c. 1950") or a decade («1950-е» / "1950s"). Null when
 *  there's no year at all. */
function lifeYear(
  date: PartialDate | null | undefined,
  locale: Locale,
): string | null {
  if (!date || date.precision === "unknown" || date.year === null) return null;
  const ru = locale === "ru";
  if (date.precision === "decade") {
    const decadeStart = Math.floor(date.year / 10) * 10;
    return ru ? `${decadeStart}-е` : `${decadeStart}s`;
  }
  const approx = date.isApproximate ? (ru ? "ок. " : "c. ") : "";
  return `${approx}${date.year}`;
}

/**
 * Compact life years for telling people apart in a person picker —
 * «1950 – 2010», a lone birth year «1950» (no «р.» — a year under a name
 * reads as birth on its own, user request 2026-09-28), «? – 2010» when only
 * the death is known, matching the tree cards' year range. Years only: a
 * day and month don't help pick between two namesakes and don't fit a list
 * row. Null when neither year is known.
 */
export function formatLifeYears(
  birth: PartialDate | null | undefined,
  death: PartialDate | null | undefined,
  locale: Locale,
): string | null {
  const born = lifeYear(birth, locale);
  const died = lifeYear(death, locale);
  if (born && died) return `${born} – ${died}`;
  if (born) return born;
  if (died) return `? – ${died}`;
  return null;
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
