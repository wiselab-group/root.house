import { isHistoryGapKind } from "./history-gaps";
import {
  deleteGapDismissal,
  insertGapDismissal,
  listDismissedGapKeys,
} from "./history-gaps.repository";

export { listDismissedGapKeys };

/** Thrown with an `errors.*` code; the action translates it. */
export class HistoryGapError extends Error {}

/**
 * «Мы не знаем» on a «Пробелы в истории» row — the family stops being
 * asked about it. The caller has already passed requireFamilyAccess; the
 * person is matched to `familyId` inside the insert itself.
 */
export async function dismissHistoryGap(
  familyId: string,
  personId: string,
  kind: unknown,
  userId: string,
): Promise<void> {
  if (!isHistoryGapKind(kind)) throw new HistoryGapError("generic");
  const found = await insertGapDismissal(familyId, personId, kind, userId);
  if (!found) throw new HistoryGapError("personNotInFamily");
}

/** «Отменить» right after «Мы не знаем» — the question comes back. */
export async function restoreHistoryGap(
  familyId: string,
  personId: string,
  kind: unknown,
): Promise<void> {
  if (!isHistoryGapKind(kind)) throw new HistoryGapError("generic");
  await deleteGapDismissal(familyId, personId, kind);
}
