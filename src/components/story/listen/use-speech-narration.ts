"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Narration } from "@/domain/story/story-narration";
import { pickVoice } from "./pick-voice";
import { canSpeak, useDeviceVoices } from "./device-voices";
import type { NarrationPlayerState, NarrationStatus } from "./narration-types";

export type { NarrationStatus };

/** «Скорость» cycles through these. */
export const NARRATION_RATES = [1, 1.25, 1.5, 0.8] as const;

const noSubscription = () => () => {};

function readSaved(key: string, max: number): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isInteger(value) && value > 0 && value < max ? value : 0;
  } catch {
    return 0;
  }
}

function writeSaved(key: string, index: number) {
  try {
    if (index > 0) window.localStorage.setItem(key, String(index));
    else window.localStorage.removeItem(key);
  } catch {
    // Blocked storage: the story just starts over next time.
  }
}

/**
 * Reads a Story aloud in the device's own voice (Web Speech
 * `speechSynthesis` — no AI service, CLAUDE.md § STORIES), one phrase per
 * utterance: Chrome cuts long utterances off, and phrase steps give
 * seeking, "resume where you stopped" and the paragraph highlight.
 *
 * Pause is cancel-and-remember, not speechSynthesis.pause(): that one is
 * unreliable (Android Chrome never resumes). Resuming re-reads the phrase
 * it stopped in. Every run gets a token, so a cancelled utterance's late
 * end/error event can't advance a newer run. The spot is remembered on this
 * device (localStorage) and cleared at the end of the story.
 */
export function useSpeechNarration(
  narration: Narration,
  storageKey: string,
): NarrationPlayerState {
  const { phrases, lang } = narration;
  const [status, setStatus] = useState<NarrationStatus>("idle");
  // null until the listener moves: then it's theirs; before, the spot
  // remembered on this device (0 on the server, so hydration matches).
  const [moved, setIndex] = useState<number | null>(null);
  const saved = useSyncExternalStore(
    noSubscription,
    () => readSaved(storageKey, phrases.length),
    () => 0,
  );
  const index = moved ?? saved;
  const [rate, setRate] = useState<number>(NARRATION_RATES[0]);
  const voices = useDeviceVoices();
  const voice = pickVoice(voices, lang);
  /** No speech at all, or the voices are known and none speaks `lang`. */
  const noVoice =
    useSyncExternalStore(noSubscription, canSpeak, () => true) === false ||
    (voices.length > 0 && voice === null);
  const run = useRef(0);

  // Leaving the page stops the voice — speech outlives the component.
  useEffect(() => {
    const runs = run;
    return () => {
      runs.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakFrom = (start: number, speed = rate) => {
    const synth = window.speechSynthesis;
    const mine = ++run.current;
    synth.cancel();
    const say = (at: number) => {
      if (mine !== run.current) return;
      if (at >= phrases.length) {
        setStatus("idle");
        setIndex(0);
        writeSaved(storageKey, 0);
        return;
      }
      setIndex(at);
      writeSaved(storageKey, at);
      const utterance = new SpeechSynthesisUtterance(phrases[at].text);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.rate = speed;
      utterance.onend = () => say(at + 1);
      utterance.onerror = (event) => {
        if (mine !== run.current) return;
        if (event.error === "interrupted" || event.error === "canceled") return;
        setStatus("paused");
      };
      synth.speak(utterance);
    };
    setStatus("playing");
    say(start);
  };

  const halt = () => {
    run.current++;
    window.speechSynthesis?.cancel();
  };

  const seek = (to: number) => {
    const at = Math.min(Math.max(to, 0), phrases.length - 1);
    if (status === "playing") speakFrom(at);
    else {
      setIndex(at);
      writeSaved(storageKey, at);
    }
  };
  // The device voice reports no times — estimated from each phrase's words.
  const startOf = (at: number) =>
    phrases.slice(0, at).reduce((sum, phrase) => sum + phrase.seconds, 0);

  return {
    source: "voice",
    recordedByName: null,
    status,
    index,
    rate,
    noVoice,
    elapsed: startOf(index),
    total: narration.totalSeconds,
    play: () => speakFrom(index),
    pause: () => {
      halt();
      setStatus("paused");
    },
    stop: () => {
      halt();
      setStatus("idle");
    },
    seekTo: (seconds: number) => {
      let at = 0;
      let start = 0;
      while (
        at < phrases.length - 1 &&
        start + phrases[at].seconds <= seconds
      ) {
        start += phrases[at].seconds;
        at++;
      }
      seek(at);
    },
    step: (direction: 1 | -1) => seek(index + direction),
    cycleRate: () => {
      const next =
        NARRATION_RATES[
          (NARRATION_RATES.indexOf(rate as (typeof NARRATION_RATES)[number]) +
            1) %
            NARRATION_RATES.length
        ];
      setRate(next);
      if (status === "playing") speakFrom(index, next);
    },
  };
}
