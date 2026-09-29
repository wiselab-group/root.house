export type NarrationStatus = "idle" | "playing" | "paused";

/** A family member's recording of the story, as the page passes it in. */
export interface StoryRecording {
  mediaId: string;
  familyId: string;
  cues: { block: string; ms: number }[];
  durationMs: number;
  recordedByName: string | null;
  /** Cover for the lock screen (the story's first photo, thumb size). */
  artwork: string | null;
}

/**
 * What every part of the «Слушать» UI reads, whichever voice is reading —
 * the device's (use-speech-narration) or a recording (use-recording-
 * narration). `index` is the narration phrase being read (for the
 * paragraph highlight and the hero photo); times are seconds on the
 * story's own timeline (estimated for the device voice).
 */
export interface NarrationPlayerState {
  source: "voice" | "recording";
  recordedByName: string | null;
  status: NarrationStatus;
  index: number;
  rate: number;
  /** Device voice only: this device can't read the story's language. */
  noVoice: boolean;
  /** Device voice only: the browser "finished" phrases without saying
   *  them — most often a muted tab or device, which no web API reports.
   *  The player stops, paused, and asks to check the sound. */
  unheard: boolean;
  elapsed: number;
  total: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  /** Previous/next phrase (device voice) or block (recording). */
  step: (direction: 1 | -1) => void;
  cycleRate: () => void;
}
