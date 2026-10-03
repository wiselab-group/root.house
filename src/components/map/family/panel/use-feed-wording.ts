"use client";

import { useTranslations } from "next-intl";
import type { FeedItem } from "@/domain/place/map-snapshot";
import type { FamilyMapState } from "../use-family-map";

/**
 * A feed beat in words, gender-neutral in both languages: who (first
 * names) as the title, what and where as the detail — «Галина, Людмила /
 * Переезд · Львов → Киев» rather than a verb that would have to agree
 * with each person («переехала/переехал»).
 */
export function useFeedWording(state: FamilyMapState) {
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
    const type =
      item.kind === "birth" || item.kind === "death"
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
