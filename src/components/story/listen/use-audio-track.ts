"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { NarrationStatus } from "./narration-types";
import { NARRATION_RATES } from "./use-speech-narration";

const noSubscription = () => () => {};
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

export interface AudioTrack {
  status: NarrationStatus;
  elapsed: number;
  rate: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  cycleRate: () => void;
}

/**
 * One recording played through a plain <audio> — a story read aloud
 * (useRecordingNarration) or a voice on a profile (useVoiceClip) — so it
 * keeps playing in a background tab and on a locked phone, with the lock
 * screen's controls and cover (Media Session). The audio element is made
 * on the first play, not during render, and is streamed in ranges from
 * /api/media (byte-range support there). Where the listener stopped is
 * remembered per `storageKey`.
 */
export function useAudioTrack({
  src,
  total,
  storageKey,
  session,
}: {
  src: string;
  /** Seconds. */
  total: number;
  storageKey: string;
  session: { title: string; artist: string; artwork: string | null };
}): AudioTrack {
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

  const getAudio = () => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = src;
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

  // Lock screen / notification / media keys (Media Session API).
  const { title, artist, artwork } = session;
  useEffect(() => {
    if (status === "idle" || !("mediaSession" in navigator)) return;
    const mediaSession = navigator.mediaSession;
    mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      artwork: artwork ? [{ src: artwork, sizes: "512x512" }] : [],
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
        mediaSession.setActionHandler(action, handler);
      } catch {
        // An action this browser doesn't know.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          mediaSession.setActionHandler(action, null);
        } catch {
          // Same.
        }
      }
    };
  }, [status, title, artist, artwork]);

  // The player going away stops the recording — and forgets the element,
  // so a remount (StrictMode's in dev) makes a fresh one on its play()
  // instead of "playing" this one with its source already removed.
  useEffect(() => {
    const ref = audioRef;
    return () => {
      ref.current?.pause();
      ref.current?.removeAttribute("src");
      ref.current = null;
    };
  }, []);

  return {
    status,
    elapsed,
    rate,
    play,
    pause: () => audioRef.current?.pause(),
    stop: () => {
      audioRef.current?.pause();
      setStatus("idle");
    },
    seekTo,
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
