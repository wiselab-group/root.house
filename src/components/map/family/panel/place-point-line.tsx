"use client";

import { useTranslations } from "next-intl";
import { CrosshairIcon, XIcon } from "lucide-react";
import type { PlaceDraft } from "../use-place-draft";

/** Where the edited place's point is — or how to set one: the map itself. */
export function PlacePointLine({ draft }: { draft: PlaceDraft }) {
  const t = useTranslations("familyMap");
  const tf = useTranslations("placeForm");
  if (!draft.point) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2 text-sm text-foreground">
        <CrosshairIcon className="size-4 shrink-0 text-primary" aria-hidden />
        {t("pointHint")}
      </p>
    );
  }
  const { latitude, longitude } = draft.point;
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {t("pointSet", {
          coords: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        })}
      </span>
      <button
        type="button"
        onClick={draft.clear}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="size-3.5" aria-hidden />
        {tf("removePoint")}
      </button>
    </div>
  );
}
