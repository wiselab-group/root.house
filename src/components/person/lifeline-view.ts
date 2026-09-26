import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { ageAt, buildLifeline } from "@/domain/event/lifeline";
import { layoutLifelineScale } from "@/domain/event/lifeline-scale";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { TimelineEvent } from "@/domain/event/event.service";
import type { TimelineRowTarget } from "./timeline-target";

export interface LifelineEventView {
  id: string;
  title: string;
  /** «Профессия · 1960 г. — 1975 г. · Пружаны» — type (when the title is
   *  free text), full date or period, and place under the title. */
  details: string;
  /** Every other known fact, one line each («Причина: …», «Участники: …»). */
  facts: string[];
  text: string | null;
  /** Same edit/open target the old list row had (see timelineRowTargetFor). */
  target: TimelineRowTarget;
}

export interface LifelinePointView {
  id: string;
  year: number;
  /** Dot position as a fraction (0–1) of the axis span. */
  position: number;
  side: "up" | "down";
  /** How the label hangs off the dot — see LifelineScaleLabel. */
  align: "start" | "center" | "end";
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
  /** Facts that needed other people's names — see resolveTimelineFacts. */
  factsById: Map<string, string[]> = new Map(),
): {
  points: LifelinePointView[];
  decades: { year: number; position: number }[];
  /** The narrowest track (px) on which no labels touch — the track fills
   *  its container and scrolls only below this (see layoutLifelineScale). */
  minWidth: number;
} | null {
  const lifeline = buildLifeline(timeline, {
    isLiving: person.isLiving,
    currentYear: new Date().getFullYear(),
  });
  if (!lifeline) return null;

  // The person's own birth — not a child's «Родилась дочь …» entry, which
  // shares the type and would otherwise stand in when the own date is unknown.
  const birthDate =
    timeline.find((event) => event.type === "birth" && !event.relatedPerson)
      ?.date ?? null;

  const labels = lifeline.points.map((point, index) => {
    const caption = point.events.map(captionFor).join(", ");
    return {
      year: point.year,
      side: point.side,
      caption,
      width: estimateLabelWidth(caption),
      align:
        index === 0
          ? ("start" as const)
          : point.year === lifeline.endYear
            ? ("end" as const)
            : ("center" as const),
    };
  });
  const scale = layoutLifelineScale({
    labels,
    startYear: lifeline.startYear,
    endYear: lifeline.endYear,
  });

  return {
    minWidth: scale.minWidth,
    decades: lifeline.decades.map((year) => ({
      year,
      position: scale.fractionOf(year),
    })),
    points: lifeline.points.map((point, index) => ({
      id: point.id,
      year: point.year,
      position: scale.fractions[index],
      side: point.side,
      align: labels[index].align,
      caption: labels[index].caption,
      kicker: [
        String(point.year),
        ageAt(point.events[0].date, birthDate, person.gender),
      ]
        .filter(Boolean)
        .join(" · "),
      events: point.events.map((event) => ({
        id: event.id,
        title: eventTitle(event),
        details: [
          eventTitle(event) !== EVENT_TYPE_LABELS[event.type] &&
          !event.relatedPerson
            ? EVENT_TYPE_LABELS[event.type]
            : null,
          periodLabel(event),
          event.placeId ? placeNameById.get(event.placeId) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        facts: [...(event.facts ?? []), ...(factsById.get(event.id) ?? [])],
        text: event.description,
        target: targetFor(event),
      })),
    })),
  };
}

/** «12 марта 1960 г.», or «1960 г. — 1975 г.» for an event that lasted. */
function periodLabel(event: TimelineEvent): string {
  const start = formatPartialDate(event.date);
  return event.endDate?.year != null
    ? `${start} — ${formatPartialDate(event.endDate)}`
    : start;
}

/**
 * A server-side guess at the label's rendered width (no DOM here, and
 * measuring on the client would shift the dots after hydration): the
 * caption in text-xs Geist runs ~6.6px per Cyrillic character, the 4-digit
 * year in text-sm ~34px, plus the label's px-1.5 padding. Errs wide — a
 * few px of extra air is invisible, an underestimate is an overlap.
 */
function estimateLabelWidth(caption: string): number {
  return Math.ceil(Math.max(34, caption.length * 7) + 12);
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
