"use client";

import { useSyncExternalStore } from "react";
import { useListeningHost } from "@/components/story/listen/listening-host";
import type { VoiceClipSource } from "@/components/story/listen/listening-store";
import type { NarrationStatus } from "@/components/story/listen/narration-types";

const noStore = () => null;
const noSubscription = () => () => {};

/**
 * A profile voice as the family-wide player sees it (ListeningHost — it
 * keeps playing after the profile is left): whether it's the one playing,
 * how far along, and one toggle — play/pause when the player holds it,
 * otherwise hand it over and start.
 */
export function useVoicePlayback(source: VoiceClipSource): {
  status: NarrationStatus;
  /** 0–1. */
  progress: number;
  remaining: number;
  toggle: () => void;
} {
  const host = useListeningHost();
  const active = useSyncExternalStore(
    host?.store.subscribe ?? noSubscription,
    host?.store.get ?? noStore,
    noStore,
  );
  const mine =
    active?.source.kind === "voice" && active.source.voiceId === source.voiceId
      ? active.player
      : null;
  const total = source.durationMs / 1000;
  const elapsed = mine?.elapsed ?? 0;
  const status = mine?.status ?? "idle";

  return {
    status,
    progress: total > 0 ? Math.min(1, elapsed / total) : 0,
    remaining: total - elapsed,
    toggle: () => {
      if (!mine) host?.start(source);
      else if (status === "playing") mine.pause();
      else mine.play();
    },
  };
}
