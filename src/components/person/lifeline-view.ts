import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { ageAt, buildLifeline } from "@/domain/event/lifeline";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { TimelineEvent } from "@/domain/event/event.service";
import type { TimelineRowTarget } from "./timeline-target";

export interface LifelineEventView {
  id: string;
  title: string;
  /** «9 февраля 1988 г. · Пружаны» — full date and place under the title. */
  details: string;
  text: string | null;
  /** Same edit/open target the old list row had (see timelineRowTargetFor). */
  target: TimelineRowTarget;
}

export interface LifelinePointView {
  id: string;
  year: number;
  position: number;
  side: "up" | "down";
  /** Short caption under the year — the event title(s). */
  caption: string;
  /** «2021 · ему 33» over the card. */
  kicker: string;
  events: LifelineEventView[];
}

/**
 * Turns a Person's (already privacy-filtered) timeline into the serializable
 * props PersonLifeline needs — all wording and every event's edit target
 * resolved here on the server, so the client component only handles
 * selection. Null when there's too little to draw a scale (see
 * buildLifeline).
 */
export function lifelineView(
  timeline: TimelineEvent[],
  person: { isLiving: boolean; gender: "male" | "female" | "unknown" },
  placeNameById: Map<string, string>,
  targetFor: (event: TimelineEvent) => TimelineRowTarget,
): {
  points: LifelinePointView[];
  decades: { year: number; position: number }[];
} | null {
  const lifeline = buildLifeline(timeline, {
    isLiving: person.isLiving,
    currentYear: new Date().getFullYear(),
  });
  if (!lifeline) return null;

  const birthYear =
    timeline.find((event) => event.type === "birth")?.date?.year ?? null;

  return {
    decades: lifeline.decades,
    points: lifeline.points.map((point) => ({
      id: point.id,
      year: point.year,
      position: point.position,
      side: point.side,
      caption: point.events.map(captionFor).join(", "),
      kicker: [String(point.year), ageAt(point.year, birthYear, person.gender)]
        .filter(Boolean)
        .join(" · "),
      events: point.events.map((event) => ({
        id: event.id,
        title: eventTitle(event),
        details: [
          formatPartialDate(event.date),
          event.placeId ? placeNameById.get(event.placeId) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        text: event.description,
        target: targetFor(event),
      })),
    })),
  };
}

/** Under the dot a child's birth is just their name («Мария, Иван» in the
 *  mock) — the full «Родилась дочь …» sentence is for the card. */
function captionFor(event: TimelineEvent): string {
  return event.relatedPerson?.firstName ?? eventTitle(event);
}

/** Manual events carry free-text titles; synthetic birth/death/marriage use
 *  the type label itself as the title (see synthesizeDerivedEvents). */
function eventTitle(event: TimelineEvent): string {
  return event.title.trim() || EVENT_TYPE_LABELS[event.type];
}
