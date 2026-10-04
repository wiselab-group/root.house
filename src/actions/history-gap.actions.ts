"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getErrorMessage } from "@/i18n/errors";
import {
  dismissHistoryGap,
  restoreHistoryGap,
  HistoryGapError,
} from "@/domain/family/history-gaps.service";

type Result = { ok: true } | { error: string };

/**
 * «Мы не знаем» on Family Home's «Пробелы в истории» — editors and up,
 * the same people who see the block (page.tsx).
 */
export async function dismissHistoryGapAction(
  familyId: string,
  familySlug: string,
  personId: string,
  kind: string,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) {
    return { error: (await getErrorMessage())("sessionExpired") };
  }
  await requireFamilyAccess(familyId, session.user.id, "editor");
  try {
    await dismissHistoryGap(familyId, personId, kind, session.user.id);
  } catch (error) {
    if (error instanceof HistoryGapError) {
      return { error: (await getErrorMessage())(error.message) };
    }
    throw error;
  }
  revalidatePath(`/families/${familySlug}`);
  return { ok: true };
}

/** The toast's «Отменить» after «Мы не знаем» — same access as dismissing. */
export async function restoreHistoryGapAction(
  familyId: string,
  familySlug: string,
  personId: string,
  kind: string,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) {
    return { error: (await getErrorMessage())("sessionExpired") };
  }
  await requireFamilyAccess(familyId, session.user.id, "editor");
  try {
    await restoreHistoryGap(familyId, personId, kind);
  } catch (error) {
    if (error instanceof HistoryGapError) {
      return { error: (await getErrorMessage())(error.message) };
    }
    throw error;
  }
  revalidatePath(`/families/${familySlug}`);
  return { ok: true };
}
