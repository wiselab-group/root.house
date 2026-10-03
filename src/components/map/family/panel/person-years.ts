import type { MapPerson } from "@/domain/place/place-map.service";

type Translate = (
  key: "yearRange" | "bornYear" | "diedYear",
  values: Record<string, number>,
) => string;

/** «1945–2026», «род. 1962», «ум. 1980», or nothing when no year is known. */
export function personYears(
  person: MapPerson,
  t: Translate,
): string | undefined {
  const { birthYear: from, deathYear: to } = person;
  if (from !== null && to !== null) return t("yearRange", { from, to });
  if (from !== null) return t("bornYear", { year: from });
  if (to !== null) return t("diedYear", { year: to });
  return undefined;
}
