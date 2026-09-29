import type { Narration } from "@/domain/story/story-narration";
import type { NarrationPlayerState, StoryRecording } from "./narration-types";

/** A story as its page hands it to the family-wide player. */
export interface StorySource {
  storyId: string;
  title: string;
  /** The story's page — the capsule links back to it from elsewhere. */
  href: string;
  narration: Narration;
  recording: StoryRecording | null;
}

/** Which story the player holds, and its live state. */
export interface ActiveNarration {
  source: StorySource;
  player: NarrationPlayerState;
}

/** One player per voice: a new recording is a different player. */
export const sourceKey = (source: StorySource) =>
  `${source.storyId}:${source.recording?.mediaId ?? "voice"}`;

/**
 * The player's state, published for the story page's parts (the «Слушать»
 * button, the hero photo, the text highlight) — a tiny external store, so
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
