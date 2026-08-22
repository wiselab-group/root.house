/**
 * Classifies a raw search query string as either a year-range lookup or a
 * name lookup — pulled out of search.service.ts as a pure function so the
 * dispatch heuristic is unit-testable without a database connection.
 */
export type ClassifiedQuery =
  | { kind: "year_range"; yearFrom: number; yearTo: number }
  | { kind: "name"; text: string };

const YEAR_QUERY_PATTERN = /^\d{3,4}$/;
const YEAR_RANGE_PATTERN = /^(\d{3,4})\s*-\s*(\d{3,4})$/;

export function classifySearchQuery(rawQuery: string): ClassifiedQuery {
  const trimmed = rawQuery.trim();

  const rangeMatch = trimmed.match(YEAR_RANGE_PATTERN);
  if (rangeMatch) {
    const [, fromStr, toStr] = rangeMatch;
    const yearFrom = Number(fromStr);
    const yearTo = Number(toStr);
    return { kind: "year_range", yearFrom: Math.min(yearFrom, yearTo), yearTo: Math.max(yearFrom, yearTo) };
  }

  if (YEAR_QUERY_PATTERN.test(trimmed)) {
    const year = Number(trimmed);
    return { kind: "year_range", yearFrom: year, yearTo: year };
  }

  return { kind: "name", text: trimmed };
}
