import { createHash } from "node:crypto";
import type { NarrationCue } from "@/db/schema";

/** Longer than any family story read aloud; also caps the stored file. */
export const MAX_NARRATION_MS = 3 * 60 * 60 * 1000;

const MAX_CUES = 2000;
const BLOCK_KEY = /^(title|lead|b\d{1,4})$/;

/**
 * The story text a recording was read from, as a short fingerprint — the
 * title is read aloud too, so it's part of it. A mismatch later means the
 * text changed after the recording and its cues may be off.
 */
export function storyTextHash(title: string, body: string): string {
  return createHash("sha256")
    .update(`${title}\n${body}`)
    .digest("base64url")
    .slice(0, 32);
}

/**
 * Validates the cues a browser sends with a recording — where each block of
 * the story starts, in ms. Returns null for anything off: not a list, too
 * many, an unknown block key, a time outside the recording, the first cue
 * not at the very start, or times going backwards.
 */
export function parseNarrationCues(
  value: unknown,
  durationMs: number,
): NarrationCue[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CUES) {
    return null;
  }
  const cues: NarrationCue[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const { block, ms } = item as Record<string, unknown>;
    if (typeof block !== "string" || !BLOCK_KEY.test(block)) return null;
    if (!Number.isInteger(ms) || (ms as number) < 0) return null;
    if ((ms as number) > durationMs) return null;
    const previous = cues[cues.length - 1];
    if (previous && (ms as number) < previous.ms) return null;
    cues.push({ block, ms: ms as number });
  }
  return cues[0].ms === 0 ? cues : null;
}
