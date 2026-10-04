"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  dismissHistoryGapAction,
  restoreHistoryGapAction,
} from "@/actions/history-gap.actions";
import { HistoryGapFeature } from "./history-gap-feature";
import { HistoryGapTile } from "./history-gap-tile";
import type { HistoryGapItem } from "./history-gap-wording";

export type { HistoryGapItem };

const FIRST_TILES = 2;
const MORE_TILES = 4;

const keyOf = (gap: HistoryGapItem) => `${gap.person.id}:${gap.kind}`;

/**
 * Family Home's «Пробелы в истории» — editors only (the page doesn't
 * render it for viewers), hidden when nothing is missing. One lead
 * question, large, and a couple more as tiles — questions to ask
 * relatives, not a task list. «Мы не знаем» hides a question at once
 * (optimistic) and for good (history_gap_dismissal). Order and the daily
 * rotation come from domain/family/history-gaps.ts.
 */
export function FamilyHistoryGaps({
  gaps,
  familyId,
  familySlug,
}: {
  gaps: HistoryGapItem[];
  familyId: string;
  familySlug: string;
}) {
  const t = useTranslations("familyHome");
  const [shown, setShown] = useState(FIRST_TILES);
  const [, startTransition] = useTransition();
  const [visible, hide] = useOptimistic(gaps, (list, key: string) =>
    list.filter((gap) => keyOf(gap) !== key),
  );
  if (visible.length === 0) return null;

  const args = (gap: HistoryGapItem) =>
    [familyId, familySlug, gap.person.id, gap.kind] as const;
  // The question disappears at once; the toast's «Отменить» deletes the
  // row again and the page's revalidation brings the question back.
  const restore = (gap: HistoryGapItem) => async () => {
    const result = await restoreHistoryGapAction(...args(gap));
    if ("error" in result) toast.error(result.error);
  };
  const dismiss = (gap: HistoryGapItem) => () =>
    startTransition(async () => {
      hide(keyOf(gap));
      const result = await dismissHistoryGapAction(...args(gap));
      if ("error" in result) toast.error(result.error);
      else {
        toast(t("gapDismissed"), {
          action: { label: t("gapUndo"), onClick: restore(gap) },
        });
      }
    });

  const [lead, ...rest] = visible;
  const tiles = rest.slice(0, shown);
  const left = rest.length - tiles.length;
  return (
    <section
      aria-labelledby="history-gaps-title"
      className="flex flex-col gap-7 rounded-3xl border border-glass-edge bg-glass px-5 py-6 sm:px-8 sm:py-8"
    >
      <header className="flex flex-col gap-1">
        <h2
          id="history-gaps-title"
          className="font-heading text-[1.625rem] font-normal"
        >
          {t("gapsTitle")}
        </h2>
        <p className="text-sm text-foreground/60">{t("gapsDescription")}</p>
      </header>
      <HistoryGapFeature
        key={keyOf(lead)}
        gap={lead}
        familyId={familyId}
        familySlug={familySlug}
        onDismiss={dismiss(lead)}
      />
      {tiles.length > 0 && (
        <ul className="grid gap-3 border-t border-glass-edge pt-6 sm:grid-cols-2">
          {tiles.map((gap) => (
            <HistoryGapTile
              key={keyOf(gap)}
              gap={gap}
              familyId={familyId}
              familySlug={familySlug}
              onDismiss={dismiss(gap)}
            />
          ))}
        </ul>
      )}
      {left > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + MORE_TILES)}
          className="-mx-3 -mt-3 self-start rounded-full px-3 py-2 text-sm text-foreground/60 transition-colors duration-base ease-(--ease-reveal) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:text-primary"
        >
          {t("gapsMore", { count: left })}
        </button>
      )}
    </section>
  );
}
