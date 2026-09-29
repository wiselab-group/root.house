/** The fields of SpeechSynthesisVoice the choice depends on. */
export interface VoiceLike {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
}

/** Hints in voice names that mark the better-sounding voices: Edge's
 *  "Online (Natural)", Apple's "Enhanced"/"Premium". */
const QUALITY = /natural|neural|premium|enhanced|online/i;

/**
 * The best device voice for a story's language (`lang`, e.g. "ru-RU"), or
 * null when the device has none — then the story can't be read aloud here.
 * Same language only (a Russian story in an English voice is gibberish);
 * the exact region beats another region of the same language. A voice on
 * the device beats a plain network one: Chrome's «Google русский» often
 * ended every phrase unsaid (user report 2026-09-29) — it's still used
 * when it's the only one. Edge's Natural voices are network ones too, but
 * sound far better and work, so quality still outweighs being local.
 */
export function pickVoice<V extends VoiceLike>(
  voices: readonly V[],
  lang: string,
): V | null {
  const base = lang.slice(0, 2).toLowerCase();
  let best: V | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const voiceLang = voice.lang.replace("_", "-").toLowerCase();
    if (voiceLang.slice(0, 2) !== base) continue;
    let score = voiceLang === lang.toLowerCase() ? 4 : 3;
    if (QUALITY.test(voice.name)) score += 4;
    if (voice.localService) score += 2;
    if (voice.default) score += 1;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}
