"use client";

import { mediaUrl } from "@/lib/media-url";
import type { VoiceClipSource } from "./listening-store";
import type { NarrationPlayerState } from "./narration-types";
import { useAudioTrack } from "./use-audio-track";

const SKIP_S = 15;

/**
 * Plays a voice kept on a person's profile (PersonVoice) through
 * useAudioTrack — no text to follow, so back/forward skip 15 seconds.
 */
export function useVoiceClip(source: VoiceClipSource): NarrationPlayerState {
  const total = source.durationMs / 1000;
  const track = useAudioTrack({
    src: mediaUrl(source.mediaId, source.familyId, "original"),
    total,
    storageKey: `root-house:voice-listen:${source.voiceId}`,
    session: {
      title: source.title,
      artist: source.personName,
      artwork: source.artwork,
    },
  });
  return {
    ...track,
    source: "recording",
    recordedByName: null,
    index: 0,
    noVoice: false,
    unheard: false,
    total,
    step: (direction) => track.seekTo(track.elapsed + direction * SKIP_S),
  };
}
