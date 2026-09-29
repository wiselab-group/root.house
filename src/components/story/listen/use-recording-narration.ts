"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { blockAt, type Narration } from "@/domain/story/story-narration";
import { mediaUrl } from "@/lib/media-url";
import type {
  NarrationPlayerState,
  NarrationStatus,
  StoryRecording,
} from "./narration-types";
import { NARRATION_RATES } from "./use-speech-narration";

const noSubscription = () => () => {};
/** «Back» restarts the current block when this far into it. */
const RESTART_WITHIN_S = 3;
const SKIP_S = 15;

function readSeconds(key: string, max: number): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    return value > 0 && value < max ? value : 0;
  } catch {
    return 0;
  }
}

function writeSeconds(key: string, seconds: number) {
  try {
    if (seconds > 0) window.localStorage.setItem(key, seconds.toFixed(1));
    else window.localStorage.removeItem(key);
  } catch {
    // Blocked storage: it just starts over next time.
  }
}

/**
 * Plays a family member's recording of the story (StoryRecorder) — a plain
 * <audio>, so it keeps playing in a background tab and on a locked phone,
 * with the lock screen's controls and cover (Media Session). Where it is in
 * the text comes from the recording's cues (block start times). The audio
 * element is made on the first play, not during render, and is streamed
 * in ranges from /api/media (byte-range support there).
 */
export function useRecordingNarration(
  narration: Narration,
  recording: StoryRecording,
  storageKey: string,
): NarrationPlayerState {
  const total = recording.durationMs / 1000;
  const [status, setStatus] = useState<NarrationStatus>("idle");
  const [time, setTime] = useState<number | null>(null);
  const saved = useSyncExternalStore(
    noSubscription,
    () => readSeconds(storageKey, total),
    () => 0,
  );
  const elapsed = time ?? saved;
  const [rate, setRate] = useState<number>(NARRATION_RATES[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const block = blockAt(recording.cues, elapsed * 1000);
  const found = narration.phrases.findIndex((p) => p.block === block);
  const index = Math.max(0, found);

  const getAudio = () => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = mediaUrl(recording.mediaId, recording.familyId, "original");
    audio.addEventListener("timeupdate", () => {
      setTime(audio.currentTime);
      writeSeconds(storageKey, audio.currentTime);
    });
    audio.addEventListener("play", () => setStatus("playing"));
    audio.addEventListener("pause", () => {
      if (!audio.ended) setStatus((s) => (s === "idle" ? s : "paused"));
    });
    audio.addEventListener("ended", () => {
      setStatus("idle");
      setTime(0);
      writeSeconds(storageKey, 0);
    });
    audio.addEventListener("error", () => setStatus("paused"));
    audioRef.current = audio;
    return audio;
  };

  const seekTo = (seconds: number) => {
    const at = Math.min(Math.max(seconds, 0), Math.max(total - 0.25, 0));
    const audio = audioRef.current;
    if (audio) audio.currentTime = at;
    setTime(at);
    writeSeconds(storageKey, at);
  };

  const play = () => {
    const audio = getAudio();
    audio.playbackRate = rate;
    if (audio.currentTime === 0 && elapsed > 0) {
      if (audio.readyState > 0) audio.currentTime = elapsed;
      else
        audio.addEventListener(
          "loadedmetadata",
          () => (audio.currentTime = elapsed),
          { once: true },
        );
    }
    setStatus("playing");
    audio.play().catch(() => setStatus("paused"));
  };
  const pause = () => audioRef.current?.pause();

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

  // Lock screen / notification / media keys (Media Session API).
  const title = narration.phrases[0]?.text ?? "";
  useEffect(() => {
    if (status === "idle" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title,
      artist: recording.recordedByName ?? "",
      artwork: recording.artwork
        ? [{ src: recording.artwork, sizes: "512x512" }]
        : [],
    });
    const audio = audioRef.current;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => audio?.play()],
      ["pause", () => audio?.pause()],
      ["seekbackward", () => audio && (audio.currentTime -= SKIP_S)],
      ["seekforward", () => audio && (audio.currentTime += SKIP_S)],
      [
        "seekto",
        (d) => audio && d.seekTime != null && (audio.currentTime = d.seekTime),
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // An action this browser doesn't know.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Same.
        }
      }
    };
  }, [status, title, recording.recordedByName, recording.artwork]);

  // Leaving the page stops the recording.
  useEffect(() => {
    const ref = audioRef;
    return () => {
      ref.current?.pause();
      ref.current?.removeAttribute("src");
    };
  }, []);

  return {
    source: "recording",
    recordedByName: recording.recordedByName,
    status,
    index,
    rate,
    noVoice: false,
    elapsed,
    total,
    play,
    pause,
    stop: () => {
      audioRef.current?.pause();
      setStatus("idle");
    },
    seekTo,
    step,
    cycleRate: () => {
      const next =
        NARRATION_RATES[
          (NARRATION_RATES.indexOf(rate as (typeof NARRATION_RATES)[number]) +
            1) %
            NARRATION_RATES.length
        ];
      setRate(next);
      if (audioRef.current) audioRef.current.playbackRate = next;
    },
  };
}
