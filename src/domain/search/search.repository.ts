import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { fromColumns, type PartialDate } from "@/domain/shared/partial-date";

export interface PersonSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  maidenName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  birthDate: PartialDate | null;
  deathDate: PartialDate | null;
  /** pg_trgm similarity score [0, 1] — used only for ranking, never shown to the user. */
  similarity: number;
}

const MIN_SIMILARITY = 0.15; // pg_trgm's own default threshold is 0.3; lower here favors recall for short Cyrillic names

/**
 * Fuzzy/typo-tolerant name search backed by the pg_trgm GIN index on
 * persons (see migrations/0001_search_trgm_index.sql) — the query's
 * `similarity(...)` expression must match that index's expression exactly
 * (first_name || ' ' || last_name || ' ' || maiden_name) or Postgres won't
 * use the index at all and will fall back to a full sequential scan.
 */
export async function searchPersonsByName(
  familyId: string,
  query: string,
  limit = 20,
): Promise<PersonSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const result = await db.execute<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    maiden_name: string | null;
    nickname: string | null;
    is_placeholder: boolean;
    birth_date_year: number | null;
    birth_date_month: number | null;
    birth_date_day: number | null;
    birth_date_precision: string | null;
    birth_date_approximate: boolean | null;
    death_date_year: number | null;
    death_date_month: number | null;
    death_date_day: number | null;
    death_date_precision: string | null;
    death_date_approximate: boolean | null;
    similarity: number;
  }>(sql`
    SELECT
      id, first_name, last_name, maiden_name, nickname, is_placeholder,
      birth_date_year, birth_date_month, birth_date_day, birth_date_precision, birth_date_approximate,
      death_date_year, death_date_month, death_date_day, death_date_precision, death_date_approximate,
      similarity(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(maiden_name, ''), ${trimmed}) AS similarity
    FROM persons
    WHERE family_id = ${familyId}
      AND (coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(maiden_name, '')) % ${trimmed}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);

  return result.rows
    .filter((row) => row.similarity >= MIN_SIMILARITY)
    .map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      maidenName: row.maiden_name,
      nickname: row.nickname,
      isPlaceholder: row.is_placeholder,
      birthDate: fromColumns({
        year: row.birth_date_year,
        month: row.birth_date_month,
        day: row.birth_date_day,
        precision: row.birth_date_precision,
        approximate: row.birth_date_approximate,
      }),
      deathDate: fromColumns({
        year: row.death_date_year,
        month: row.death_date_month,
        day: row.death_date_day,
        precision: row.death_date_precision,
        approximate: row.death_date_approximate,
      }),
      similarity: row.similarity,
    }));
}

/** Exact/range match on birth or death year — no trigram index needed, persons_family_idx covers family_id filtering. */
export async function searchPersonsByYear(
  familyId: string,
  yearFrom: number,
  yearTo: number,
  limit = 50,
): Promise<PersonSearchResult[]> {
  const result = await db.execute<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    maiden_name: string | null;
    nickname: string | null;
    is_placeholder: boolean;
    birth_date_year: number | null;
    birth_date_month: number | null;
    birth_date_day: number | null;
    birth_date_precision: string | null;
    birth_date_approximate: boolean | null;
    death_date_year: number | null;
    death_date_month: number | null;
    death_date_day: number | null;
    death_date_precision: string | null;
    death_date_approximate: boolean | null;
  }>(sql`
    SELECT
      id, first_name, last_name, maiden_name, nickname, is_placeholder,
      birth_date_year, birth_date_month, birth_date_day, birth_date_precision, birth_date_approximate,
      death_date_year, death_date_month, death_date_day, death_date_precision, death_date_approximate
    FROM persons
    WHERE family_id = ${familyId}
      AND (
        (birth_date_year BETWEEN ${yearFrom} AND ${yearTo})
        OR (death_date_year BETWEEN ${yearFrom} AND ${yearTo})
      )
    ORDER BY birth_date_year NULLS LAST
    LIMIT ${limit}
  `);

  return result.rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    maidenName: row.maiden_name,
    nickname: row.nickname,
    isPlaceholder: row.is_placeholder,
    birthDate: fromColumns({
      year: row.birth_date_year,
      month: row.birth_date_month,
      day: row.birth_date_day,
      precision: row.birth_date_precision,
      approximate: row.birth_date_approximate,
    }),
    deathDate: fromColumns({
      year: row.death_date_year,
      month: row.death_date_month,
      day: row.death_date_day,
      precision: row.death_date_precision,
      approximate: row.death_date_approximate,
    }),
    similarity: 1,
  }));
}
