"use client";

import { useSyncExternalStore } from "react";

const NONE: SpeechSynthesisVoice[] = [];
let cached: SpeechSynthesisVoice[] = NONE;
let cachedKey = "";

function subscribe(onStoreChange: () => void): () => void {
  if (!("speechSynthesis" in window)) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onStoreChange);
  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", onStoreChange);
}

/** getVoices() returns a fresh array each call — keep one per voice set. */
function getSnapshot(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return NONE;
  const voices = window.speechSynthesis.getVoices();
  const key = voices.map((voice) => voice.voiceURI).join("|");
  if (key !== cachedKey) {
    cached = voices;
    cachedKey = key;
  }
  return cached;
}

/**
 * The device's speech voices, live: Chrome loads them after the page does
 * (an empty list first, then «voiceschanged»), Safari has them at once.
 * Empty on the server and where Web Speech doesn't exist.
 */
export function useDeviceVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => NONE);
}

/** Whether this browser can speak at all (false on the server). */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
