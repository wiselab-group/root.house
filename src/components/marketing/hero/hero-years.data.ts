import {
  LANDING_PHOTOS,
  type LandingPhoto,
} from "@/components/marketing/shared/landing-photos";

/** The hero's span: Ivan's birth to the year the archive is started. */
export const YEAR_FROM = 1928;
export const YEAR_TO = 2026;

/** Where the hero rests when nothing moves (reduced motion): today. */
export const REST_YEAR = YEAR_TO;

export type HeroEventId =
  | "ivanBorn"
  | "veraBorn"
  | "dance"
  | "wedding"
  | "paulBorn"
  | "tallinn"
  | "youBorn"
  | "lilyBorn"
  | "kidBorn"
  | "archive";

/** The fictional family's years, as on the story page
 *  (landing.storyPage.captions: Riga 1951 and 1952, Tallinn 1958). */
export const HERO_EVENTS: readonly { year: number; id: HeroEventId }[] = [
  { year: 1928, id: "ivanBorn" },
  { year: 1931, id: "veraBorn" },
  { year: 1951, id: "dance" },
  { year: 1952, id: "wedding" },
  { year: 1955, id: "paulBorn" },
  { year: 1958, id: "tallinn" },
  { year: 1989, id: "youBorn" },
  { year: 1993, id: "lilyBorn" },
  { year: 2019, id: "kidBorn" },
  { year: 2026, id: "archive" },
];

/** The photo behind each stretch of years. */
export const HERO_ERAS: readonly { from: number; photo: LandingPhoto }[] = [
  { from: YEAR_FROM, photo: LANDING_PHOTOS.stroll },
  { from: 1951, photo: LANDING_PHOTOS.ballroom },
  { from: 1952, photo: LANDING_PHOTOS.weddingParty },
  { from: 1958, photo: LANDING_PHOTOS.grandmother },
  { from: 1989, photo: LANDING_PHOTOS.wedding },
];

/** Autoplay: the whole span in PLAY_MS, then a rest on the last year for
 *  HOLD_MS, and over again. */
export const PLAY_MS = 16_000;
export const HOLD_MS = 3_000;

const SPAN = YEAR_TO - YEAR_FROM;
const CYCLE_MS = PLAY_MS + HOLD_MS;

/** 0..1 along the span. */
export function yearProgress(year: number): number {
  return Math.min(Math.max((year - YEAR_FROM) / SPAN, 0), 1);
}

/** The year autoplay shows `elapsed` ms into its loop. */
export function yearAtElapsed(elapsed: number): number {
  const t = ((elapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  return Math.round(YEAR_FROM + Math.min(t / PLAY_MS, 1) * SPAN);
}

/** Where in the loop a year sits — so autoplay resumes from the year the
 *  visitor left it on instead of jumping back. */
export function elapsedForYear(year: number): number {
  return yearProgress(year) * PLAY_MS;
}

/** The latest event at or before `year`. */
export function eventAt(year: number): (typeof HERO_EVENTS)[number] {
  return HERO_EVENTS.findLast((event) => event.year <= year) ?? HERO_EVENTS[0];
}

/** Index of the era photo shown in `year`. */
export function eraIndexAt(year: number): number {
  return Math.max(
    HERO_ERAS.findLastIndex((era) => era.from <= year),
    0,
  );
}
