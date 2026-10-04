"use client";

import { useTranslations } from "next-intl";
import {
  snapshotAt,
  storyCaptionAt,
  type TimelineRange,
} from "@/domain/place/map-snapshot";
import { useFeedWording } from "../panel/use-feed-wording";
import type { FamilyMapState } from "../use-family-map";

const SHOWN_PLACES = 3;

/**
 * The timeline caption in words (see storyCaptionAt): a fresh beat —
 * «1988 · Александр · Рождение · Залесье»; a quiet year — «Семья: Речки,
 * Залесье»; the end — «Сегодня · Семья: Таллинн · 6 поколений ·
 * 4 города · 2 страны». Place names stay in the nominative: no case to
 * agree with in either language.
 */
export function useStoryCaption(
  state: FamilyMapState,
  range: TimelineRange,
  year: number,
): { lead: string | null; text: string } | null {
  const t = useTranslations("familyMap");
  const word = useFeedWording(state);
  const { data } = state;
  const caption = storyCaptionAt(data.model, state.feed, range, year);
  if (!caption) return null;

  if (caption.kind === "beat") {
    const { title, detail } = word(caption.item);
    return {
      lead: String(caption.item.year),
      text: [title, detail].filter(Boolean).join(" · "),
    };
  }

  const names = caption.placeIds
    .map((id) => data.places.find((p) => p.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const shown = names.slice(0, SHOWN_PLACES).join(", ");
  const places =
    names.length > SHOWN_PLACES
      ? t("captionMore", { places: shown, count: names.length - SHOWN_PLACES })
      : shown;
  const where = places ? t("captionSettled", { places }) : null;

  if (caption.kind === "settled") {
    // No year here: the dock shows it large already, and a caption that
    // changed every year would be read out every year (aria-live).
    return where ? { lead: null, text: where } : null;
  }
  const stats = snapshotAt(data.model, "all").stats;
  return {
    lead: t("captionToday"),
    text: [
      where,
      t("captionTodayStats", {
        generations: stats.generations,
        places: stats.places,
        countries: stats.countries,
      }),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
