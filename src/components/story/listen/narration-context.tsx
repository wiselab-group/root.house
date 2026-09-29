"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Narration } from "@/domain/story/story-narration";
import { useListeningHost } from "./listening-host";
import type { StorySource } from "./listening-store";
import type { NarrationPlayerState, StoryRecording } from "./narration-types";

export interface NarrationContextValue extends NarrationPlayerState {
  narration: Narration;
}

const NarrationContext = createContext<NarrationContextValue | null>(null);

/** The story's narration, or null outside a story page (e.g. the carousel
 *  used elsewhere) — callers treat null as "nothing is being read". */
export function useNarration(): NarrationContextValue | null {
  return useContext(NarrationContext);
}

const noop = () => {};
const noStore = () => null;
const noSubscription = () => noop;

/**
 * Wraps a Story page: hands the story to the family-wide player
 * (ListeningHost — it keeps playing after the page is left) and gives the
 * page's parts — the «Слушать» button, the carousel (shows the photo the
 * text is at), the reading column's highlight, the recorder — the player's
 * state. While the player holds another story, this page sees an idle
 * player whose «Слушать» switches it to this story.
 */
export function NarrationProvider({
  narration,
  storyId,
  title,
  href,
  recording,
  children,
}: {
  narration: Narration;
  storyId: string;
  title: string;
  href: string;
  recording: StoryRecording | null;
  children: ReactNode;
}) {
  const host = useListeningHost();
  const source = useMemo<StorySource>(
    () => ({ storyId, title, href, narration, recording }),
    [storyId, title, href, narration, recording],
  );

  useEffect(() => {
    if (!host) return;
    host.offer(source);
    return () => host.withdraw(source.storyId);
  }, [host, source]);

  const active = useSyncExternalStore(
    host?.store.subscribe ?? noSubscription,
    host?.store.get ?? noStore,
    noStore,
  );
  const player: NarrationPlayerState =
    active && active.source.storyId === storyId
      ? active.player
      : {
          source: recording ? "recording" : "voice",
          recordedByName: recording?.recordedByName ?? null,
          status: "idle",
          index: 0,
          rate: 1,
          noVoice: false,
          unheard: false,
          elapsed: 0,
          total: recording
            ? recording.durationMs / 1000
            : narration.totalSeconds,
          play: () => host?.start(source),
          pause: noop,
          stop: noop,
          seekTo: noop,
          step: noop,
          cycleRate: noop,
        };

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
