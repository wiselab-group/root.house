import type { PartialDate } from "@/domain/shared/partial-date";

/** Longer than any cassette side; also caps what's stored. */
export const MAX_VOICE_MS = 3 * 60 * 60 * 1000;
/** Bars in the stored waveform — enough for the widest profile strip. */
export const VOICE_PEAK_COUNT = 64;
const MAX_TITLE = 120;
const MAX_NARRATOR = 80;

export type VoiceSpeaker = "self" | "narrator";

export interface VoiceDetails {
  speaker: VoiceSpeaker;
  narratorName: string | null;
  title: string | null;
  recordedDate: PartialDate | null;
}

/** Why a voice's details were refused — an `errors.*` code. */
export type VoiceInputError = "invalidRecording" | "voiceNarratorMissing";

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : null;
};

/**
 * The details a browser sends with a voice recording, checked: a known
 * speaker, a narrator's name for someone telling about the person (the
 * profile names them), a short title, and a recording date whose parts are
 * in range and not in the future. Returns an error code instead of
 * throwing, so the service decides what to do with the uploaded file.
 */
export function parseVoiceDetails(
  input: {
    speaker: unknown;
    narratorName: unknown;
    title: unknown;
    recordedDate: PartialDate | null | undefined;
  },
  now: Date,
): VoiceDetails | VoiceInputError {
  if (input.speaker !== "self" && input.speaker !== "narrator") {
    return "invalidRecording";
  }
  const narratorName =
    input.speaker === "narrator"
      ? text(input.narratorName, MAX_NARRATOR)
      : null;
  if (input.speaker === "narrator" && !narratorName) {
    return "voiceNarratorMissing";
  }
  const date = input.recordedDate ?? null;
  if (date && !isPlausibleDate(date, now)) return "invalidRecording";
  return {
    speaker: input.speaker,
    narratorName,
    title: text(input.title, MAX_TITLE),
    recordedDate: date,
  };
}

function isPlausibleDate(date: PartialDate, now: Date): boolean {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || year === null) return false;
  // Sound recording starts in the 1870s.
  if (year < 1870 || year > now.getUTCFullYear()) return false;
  if (month !== null && !(Number.isInteger(month) && month >= 1 && month <= 12))
    return false;
  if (day !== null && !(Number.isInteger(day) && day >= 1 && day <= 31))
    return false;
  return !(day !== null && month === null);
}

/**
 * A waveform the browser measured: exactly VOICE_PEAK_COUNT numbers in
 * 0–1, rounded to two places for storage. Null for anything else — the
 * profile then shows the recording without a waveform, never a wrong one.
 */
export function parseVoicePeaks(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== VOICE_PEAK_COUNT) return null;
  const peaks: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !(item >= 0 && item <= 1)) return null;
    peaks.push(Math.round(item * 100) / 100);
  }
  return peaks;
}

export function isValidVoiceDuration(durationMs: number): boolean {
  return (
    Number.isFinite(durationMs) && durationMs > 0 && durationMs <= MAX_VOICE_MS
  );
}
