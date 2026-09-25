import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { ageAt, buildLifeline } from "@/domain/event/lifeline";
import { layoutLifelineScale } from "@/domain/event/lifeline-scale";
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
  /** Dot position on the track, in percent. */
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
): {
  points: LifelinePointView[];
  decades: { year: number; position: number }[];
  /** The track's minimum width in px — wider than the base when the scale
   *  had to zoom in for dense years' labels (see layoutLifelineScale). */
  width: number;
} | null {
  const lifeline = buildLifeline(timeline, {
    isLiving: person.isLiving,
    currentYear: new Date().getFullYear(),
  });
  if (!lifeline) return null;

  const birthYear =
    timeline.find((event) => event.type === "birth")?.date?.year ?? null;

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
    minWidth: BASE_TRACK_WIDTH,
  });

  return {
    width: scale.width,
    decades: lifeline.decades.map((year) => ({
      year,
      position: scale.positionOf(year),
    })),
    points: lifeline.points.map((point, index) => ({
      id: point.id,
      year: point.year,
      position: scale.positions[index],
      side: point.side,
      align: labels[index].align,
      caption: labels[index].caption,
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

/** The track's width when nothing needs zooming — the phone-scroll
 *  minimum the axis always had. */
const BASE_TRACK_WIDTH = 660;

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
