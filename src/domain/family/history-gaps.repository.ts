import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { historyGapDismissals } from "@/db/schema";
import type { HistoryGapKind } from "./history-gaps";

/** Every «Мы не знаем» in the family, as `personId:kind` keys
 *  (history-gaps.ts's gapKey). */
export async function listDismissedGapKeys(
  familyId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({
      personId: historyGapDismissals.personId,
      kind: historyGapDismissals.kind,
    })
    .from(historyGapDismissals)
    .where(eq(historyGapDismissals.familyId, familyId));
  return new Set(rows.map((r) => `${r.personId}:${r.kind}`));
}

/**
 * Marks a gap «Мы не знаем». One statement: the person is looked up with
 * `family_id` in the same INSERT … SELECT, so an id from another family
 * inserts nothing and returns false (CLAUDE.md: no resolving by id
 * without family_id). Repeating it is a no-op that still returns true.
 */
export async function insertGapDismissal(
  familyId: string,
  personId: string,
  kind: HistoryGapKind,
  userId: string,
): Promise<boolean> {
  const result = await db.execute<{ person_id: string }>(sql`
    with target as (
      select id from persons
      where id = ${personId} and family_id = ${familyId}
    ), inserted as (
      insert into history_gap_dismissal (family_id, person_id, kind, dismissed_by)
      select ${familyId}, id, ${kind}, ${userId} from target
      on conflict (person_id, kind) do nothing
      returning person_id
    )
    select id as person_id from target
  `);
  return result.rows.length > 0;
}

/** Undoes a «Мы не знаем» — family-scoped in the same DELETE. */
export async function deleteGapDismissal(
  familyId: string,
  personId: string,
  kind: HistoryGapKind,
): Promise<void> {
  await db
    .delete(historyGapDismissals)
    .where(
      and(
        eq(historyGapDismissals.familyId, familyId),
        eq(historyGapDismissals.personId, personId),
        eq(historyGapDismissals.kind, kind),
      ),
    );
}
