"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Narration } from "@/domain/story/story-narration";
import type { NarrationPlayerState, StoryRecording } from "./narration-types";
import { useRecordingNarration } from "./use-recording-narration";
import { useSpeechNarration } from "./use-speech-narration";

export interface NarrationContextValue extends NarrationPlayerState {
  narration: Narration;
}

const NarrationContext = createContext<NarrationContextValue | null>(null);

/** The story's narration, or null outside a story page (e.g. the carousel
 *  used elsewhere) — callers treat null as "nothing is being read". */
export function useNarration(): NarrationContextValue | null {
  return useContext(NarrationContext);
}

/**
 * Wraps a Story page: one narration shared by the «Слушать» button in the
 * hero, the carousel (shows the photo the text is at), the player capsule
 * and the reading column's highlight. A family member's recording plays if
 * the story has one; otherwise the device's voice reads the text. Either
 * way it stops when the page is left.
 */
export function NarrationProvider({
  narration,
  storyId,
  recording,
  children,
}: {
  narration: Narration;
  storyId: string;
  recording: StoryRecording | null;
  children: ReactNode;
}) {
  const key = `root-house:story-listen:${storyId}`;
  return recording ? (
    <RecordingProvider
      narration={narration}
      recording={recording}
      storageKey={`${key}:${recording.mediaId}`}
    >
      {children}
    </RecordingProvider>
  ) : (
    <VoiceProvider narration={narration} storageKey={key}>
      {children}
    </VoiceProvider>
  );
}

function VoiceProvider({
  narration,
  storageKey,
  children,
}: {
  narration: Narration;
  storageKey: string;
  children: ReactNode;
}) {
  const player = useSpeechNarration(narration, storageKey);
  return (
    <Provide narration={narration} player={player}>
      {children}
    </Provide>
  );
}

function RecordingProvider({
  narration,
  recording,
  storageKey,
  children,
}: {
  narration: Narration;
  recording: StoryRecording;
  storageKey: string;
  children: ReactNode;
}) {
  const player = useRecordingNarration(narration, recording, storageKey);
  return (
    <Provide narration={narration} player={player}>
      {children}
    </Provide>
  );
}

function Provide({
  narration,
  player,
  children,
}: {
  narration: Narration;
  player: NarrationPlayerState;
  children: ReactNode;
}) {
  const block =
    player.status === "idle" ? null : narration.phrases[player.index]?.block;

  // Lights the block being read (StoryArticle marks every block with
  // data-narration-block). DOM, not React state: the reading column is
  // server-rendered and shouldn't re-render per phrase.
  useEffect(() => {
    if (!block) return;
    const el = document.querySelector(`[data-narration-block="${block}"]`);
    el?.setAttribute("data-narration-now", "");
    return () => el?.removeAttribute("data-narration-now");
  }, [block]);

  return (
    <NarrationContext.Provider value={{ ...player, narration }}>
      {children}
    </NarrationContext.Provider>
  );
}
