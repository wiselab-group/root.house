"use client";

import { blockAt, type Narration } from "@/domain/story/story-narration";
import { mediaUrl } from "@/lib/media-url";
import type { NarrationPlayerState, StoryRecording } from "./narration-types";
import { useAudioTrack } from "./use-audio-track";

/** «Back» restarts the current block when this far into it. */
const RESTART_WITHIN_S = 3;

/**
 * Plays a family member's recording of the story (StoryRecorder) through
 * useAudioTrack. Where it is in the text comes from the recording's cues
 * (block start times); back/forward jump between blocks.
 */
export function useRecordingNarration(
  narration: Narration,
  recording: StoryRecording,
  storageKey: string,
): NarrationPlayerState {
  const total = recording.durationMs / 1000;
  const track = useAudioTrack({
    src: mediaUrl(recording.mediaId, recording.familyId, "original"),
    total,
    storageKey,
    session: {
      title: narration.phrases[0]?.text ?? "",
      artist: recording.recordedByName ?? "",
      artwork: recording.artwork,
    },
  });
  const { elapsed, seekTo } = track;

  const block = blockAt(recording.cues, elapsed * 1000);
  const found = narration.phrases.findIndex((p) => p.block === block);
  const index = Math.max(0, found);

  const step = (direction: 1 | -1) => {
    const cues = recording.cues;
    const ms = elapsed * 1000;
    let at = cues.findLastIndex((cue) => cue.ms <= ms);
    if (
      direction < 0 &&
      at >= 0 &&
      elapsed - cues[at].ms / 1000 > RESTART_WITHIN_S
    ) {
      return seekTo(cues[at].ms / 1000);
    }
    at = Math.min(Math.max(at + direction, 0), cues.length - 1);
    seekTo(cues[at].ms / 1000);
  };

  return {
    ...track,
    source: "recording",
    recordedByName: recording.recordedByName,
    index,
    noVoice: false,
    unheard: false,
    total,
    step,
  };
}
