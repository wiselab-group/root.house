"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Narration } from "@/domain/story/story-narration";
import {
  useSpeechNarration,
  type SpeechNarration,
} from "./use-speech-narration";

interface NarrationContextValue extends SpeechNarration {
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
 * and the reading column's highlight. Stops when the page is left.
 */
export function NarrationProvider({
  narration,
  storyId,
  children,
}: {
  narration: Narration;
  storyId: string;
  children: ReactNode;
}) {
  const speech = useSpeechNarration(
    narration,
    `root-house:story-listen:${storyId}`,
  );
  const block =
    speech.status === "idle" ? null : narration.phrases[speech.index]?.block;

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
    <NarrationContext.Provider value={{ ...speech, narration }}>
      {children}
    </NarrationContext.Provider>
  );
}
