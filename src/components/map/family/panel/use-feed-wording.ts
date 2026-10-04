"use client";

import { useTranslations } from "next-intl";
import type { FeedItem } from "@/domain/place/map-snapshot";
import type { FamilyMapState } from "../use-family-map";

/**
 * A feed beat in words, gender-neutral in both languages: who (first
 * names) as the title, what and where as the detail — «Галина, Людмила /
 * Переезд · Львов → Киев» rather than a verb that would have to agree
 * with each person («переехала/переехал»). A death shows the years of the
 * life it closed.
 */
export function useFeedWording(state: FamilyMapState) {
  const t = useTranslations("familyMap");
  const tTypes = useTranslations("eventTypes");
  const { data } = state;
  const placeName = (id: string | null) =>
    id ? data.places.find((p) => p.id === id)?.name : undefined;

  return (item: FeedItem): { title: string; detail: string } => {
    const names = item.personIds
      .map((id) => data.people[id]?.firstName)
      .filter(Boolean)
      .join(", ");
    const event = item.eventId ? data.events[item.eventId] : undefined;
    // A death reads as the life it closed — «Галина · 1967–2026 · Пружаны»
    // — never the bare word «Смерть» on a story's caption.
    const born =
      item.personIds.length === 1
        ? data.people[item.personIds[0]]?.birthYear
        : undefined;
    const type =
      item.kind === "death"
        ? t("yearRange", { from: born ?? "…", to: item.year })
        : item.kind === "birth"
          ? tTypes(item.kind)
          : item.eventType
            ? tTypes(item.eventType)
            : "";
    const where =
      item.kind === "move" && item.fromPlaceId
        ? `${placeName(item.fromPlaceId)} → ${placeName(item.placeId)}`
        : placeName(item.placeId);
    const what = event?.title && event.title !== type ? event.title : type;
    return {
      title: names || what,
      detail: [names ? what : null, where].filter(Boolean).join(" · "),
    };
  };
}
