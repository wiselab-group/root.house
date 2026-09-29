import { describe, expect, it } from "vitest";
import {
  isValidVoiceDuration,
  MAX_VOICE_MS,
  parseVoiceDetails,
  parseVoicePeaks,
  VOICE_PEAK_COUNT,
} from "./voice-input";

const now = new Date("2026-09-29T12:00:00Z");
const year = (y: number, approx = false) => ({
  year: y,
  month: null,
  day: null,
  precision: "year_only" as const,
  isApproximate: approx,
});

describe("parseVoiceDetails", () => {
  it("keeps the person's own voice with a trimmed title and year", () => {
    expect(
      parseVoiceDetails(
        {
          speaker: "self",
          narratorName: "ignored",
          title: "  Поёт   «Ой, у гаю» ",
          recordedDate: year(1967),
        },
        now,
      ),
    ).toEqual({
      speaker: "self",
      narratorName: null,
      title: "Поёт «Ой, у гаю»",
      recordedDate: year(1967),
    });
  });

  it("requires a narrator's name for someone telling about the person", () => {
    expect(
      parseVoiceDetails(
        {
          speaker: "narrator",
          narratorName: "  ",
          title: "",
          recordedDate: null,
        },
        now,
      ),
    ).toBe("voiceNarratorMissing");
    expect(
      parseVoiceDetails(
        {
          speaker: "narrator",
          narratorName: "Галина",
          title: "",
          recordedDate: null,
        },
        now,
      ),
    ).toMatchObject({
      speaker: "narrator",
      narratorName: "Галина",
      title: null,
    });
  });

  it("refuses an unknown speaker and implausible dates", () => {
    const base = { narratorName: null, title: null };
    expect(
      parseVoiceDetails({ ...base, speaker: "ai", recordedDate: null }, now),
    ).toBe("invalidRecording");
    for (const recordedDate of [
      year(1860),
      year(2027),
      { ...year(1967), month: 13 },
      { ...year(1967), day: 4 },
    ]) {
      expect(
        parseVoiceDetails({ ...base, speaker: "self", recordedDate }, now),
      ).toBe("invalidRecording");
    }
  });
});

describe("parseVoicePeaks", () => {
  it("rounds a full waveform to two places", () => {
    const peaks = Array.from(
      { length: VOICE_PEAK_COUNT },
      (_, i) => i / 100 + 0.001,
    );
    expect(parseVoicePeaks(peaks)?.[5]).toBe(0.05);
  });

  it("drops anything that isn't exactly the expected bars in 0–1", () => {
    expect(parseVoicePeaks(null)).toBeNull();
    expect(parseVoicePeaks([0.5])).toBeNull();
    expect(
      parseVoicePeaks(Array.from({ length: VOICE_PEAK_COUNT }, () => 1.5)),
    ).toBeNull();
    expect(
      parseVoicePeaks(Array.from({ length: VOICE_PEAK_COUNT }, () => "0.5")),
    ).toBeNull();
  });
});

describe("isValidVoiceDuration", () => {
  it("accepts up to three hours", () => {
    expect(isValidVoiceDuration(860_000)).toBe(true);
    expect(isValidVoiceDuration(0)).toBe(false);
    expect(isValidVoiceDuration(MAX_VOICE_MS + 1)).toBe(false);
    expect(isValidVoiceDuration(Number.NaN)).toBe(false);
  });
});
