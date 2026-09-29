import type { Narration } from "@/domain/story/story-narration";
import type { NarrationPlayerState, StoryRecording } from "./narration-types";

/** A story as its page hands it to the family-wide player. */
export interface StorySource {
  kind: "story";
  storyId: string;
  title: string;
  /** The story's page — the capsule links back to it from elsewhere. */
  href: string;
  narration: Narration;
  recording: StoryRecording | null;
}

/** A voice kept on a person's profile (PersonVoice) — a recording on its
 *  own, with no text to follow. */
export interface VoiceClipSource {
  kind: "voice";
  voiceId: string;
  mediaId: string;
  familyId: string;
  /** «Голос» / «Рассказывает Галина» / its own title. */
  title: string;
  /** Whose profile it's on — the lock screen's second line. */
  personName: string;
  /** The date and length line, as the profile shows it. */
  subtitle: string;
  /** The person's profile — the capsule links back to it. */
  href: string;
  durationMs: number;
  /** The person's portrait, thumb size, for the lock screen. */
  artwork: string | null;
}

export type ListenSource = StorySource | VoiceClipSource;

/** What the player holds, and its live state. */
export interface ActiveNarration {
  source: ListenSource;
  player: NarrationPlayerState;
}

/** One player per voice: a new recording is a different player. */
export const sourceKey = (source: ListenSource) =>
  source.kind === "voice"
    ? `voice:${source.voiceId}`
    : `${source.storyId}:${source.recording?.mediaId ?? "voice"}`;

/**
 * The player's state, published for the page parts that show it (a story's
 * «Слушать» button, hero photo and text highlight; a profile's voice) — a tiny external store, so
 * a new phrase re-renders only them, not the family layout around them.
 */
export function createListeningStore() {
  let value: ActiveNarration | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: ActiveNarration | null) {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type ListeningStore = ReturnType<typeof createListeningStore>;
