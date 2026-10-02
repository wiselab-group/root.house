import { describe, expect, it } from "vitest";
import {
  HERO_ERAS,
  HERO_EVENTS,
  HOLD_MS,
  PLAY_MS,
  YEAR_FROM,
  YEAR_TO,
  elapsedForYear,
  eraIndexAt,
  eventAt,
  yearAtElapsed,
  yearProgress,
} from "./hero-years.data";

describe("hero years", () => {
  it("plays the whole span, rests on the last year, then starts over", () => {
    expect(yearAtElapsed(0)).toBe(YEAR_FROM);
    expect(yearAtElapsed(PLAY_MS)).toBe(YEAR_TO);
    expect(yearAtElapsed(PLAY_MS + HOLD_MS - 1)).toBe(YEAR_TO);
    expect(yearAtElapsed(PLAY_MS + HOLD_MS)).toBe(YEAR_FROM);
  });

  it("resumes autoplay from the year it was left on", () => {
    for (const year of [YEAR_FROM, 1952, 1989, YEAR_TO]) {
      expect(yearAtElapsed(elapsedForYear(year))).toBe(year);
    }
  });

  it("measures progress along the span", () => {
    expect(yearProgress(YEAR_FROM)).toBe(0);
    expect(yearProgress(YEAR_TO)).toBe(1);
    expect(yearProgress(YEAR_TO + 10)).toBe(1);
  });

  it("names the latest event at or before a year", () => {
    expect(eventAt(1950).id).toBe("veraBorn");
    expect(eventAt(1951).id).toBe("dance");
    expect(eventAt(2000).id).toBe("lilyBorn");
    expect(eventAt(YEAR_TO).id).toBe("archive");
  });

  it("starts with an event and an era in the first year", () => {
    expect(HERO_EVENTS[0].year).toBe(YEAR_FROM);
    expect(HERO_ERAS[0].from).toBe(YEAR_FROM);
  });

  it("picks the era photo for a year", () => {
    expect(eraIndexAt(YEAR_FROM)).toBe(0);
    expect(eraIndexAt(1950)).toBe(0);
    expect(eraIndexAt(1952)).toBe(2);
    expect(eraIndexAt(YEAR_TO)).toBe(HERO_ERAS.length - 1);
  });
});
