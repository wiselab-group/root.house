import { classifySearchQuery } from "./query-classifier";
import {
  searchPersonsByName,
  searchPersonsByNameSubstring,
  searchPersonsByYear,
  type PersonSearchResult,
} from "./search.repository";

export type { PersonSearchResult };

/**
 * Single search entry point for the MVP: name/maiden-name fuzzy match via
 * pg_trgm, OR a birth/death year (exact "1920" or range "1900-1950") if the
 * query looks like one — see query-classifier.ts for the (unit-tested)
 * dispatch heuristic. See PRODUCT.md's MVP search scope (name/years).
 *
 * Extending this later (place, occupation, events, media, stories) means
 * adding to this function's dispatch, not changing its callers — the
 * interface search.service.ts exposes stays "one query string in, results
 * out" even as the underlying implementation grows more filters.
 */
export async function searchPeople(familyId: string, query: string): Promise<PersonSearchResult[]> {
  const classified = classifySearchQuery(query);

  if (classified.kind === "year_range") {
    return searchPersonsByYear(familyId, classified.yearFrom, classified.yearTo);
  }

  if (classified.text.length === 0) return [];
  return searchPersonsByName(familyId, classified.text);
}

/**
 * "Browse everyone, then narrow" lookup for person pickers (Relationship
 * Trace's Person A/B combobox): blank query returns the whole family so the
 * list is populated the moment the field is focused, and any non-blank
 * query does a plain substring match rather than searchPeople's
 * typo-tolerant pg_trgm ranking — a single letter should surface every name
 * containing it, which similarity scoring does not do for short queries.
 */
export async function searchPeopleForPicker(familyId: string, query: string): Promise<PersonSearchResult[]> {
  return searchPersonsByNameSubstring(familyId, query);
}
