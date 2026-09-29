"use client";

import { useEffect, useEffectEvent, useLayoutEffect } from "react";
import type { ListeningStore, StorySource } from "./listening-store";
import type { NarrationPlayerState } from "./narration-types";
import { StoryPlayerCapsule } from "./story-player-capsule";
import { useRecordingNarration } from "./use-recording-narration";
import { useSpeechNarration } from "./use-speech-narration";

interface ActivePlayerProps {
  source: StorySource;
  /** Start playing on mount — «Слушать» pressed on a story the player
   *  didn't hold yet. */
  autoPlay: boolean;
  store: ListeningStore;
  /** On the story's own page the capsule shows the chapter; elsewhere,
   *  the story's title, linking back. */
  onStoryPage: boolean;
}

const storageKey = (source: StorySource) =>
  `root-house:story-listen:${source.storyId}`;

/** The player of ListeningHost's current story: a family member's
 *  recording if it has one, the device's voice otherwise. Keyed by the
 *  story (and recording) — a new story is a fresh player. */
export function ActivePlayer(props: ActivePlayerProps) {
  return props.source.recording ? (
    <RecordingPlayer {...props} />
  ) : (
    <VoicePlayer {...props} />
  );
}

function VoicePlayer(props: ActivePlayerProps) {
  const player = useSpeechNarration(
    props.source.narration,
    storageKey(props.source),
  );
  return <Publish {...props} player={player} />;
}

function RecordingPlayer(props: ActivePlayerProps) {
  const { source } = props;
  // ActivePlayer only renders this when there is a recording.
  const recording = source.recording as NonNullable<StorySource["recording"]>;
  const player = useRecordingNarration(
    source.narration,
    recording,
    `${storageKey(source)}:${recording.mediaId}`,
  );
  return <Publish {...props} player={player} />;
}

function Publish({
  source,
  autoPlay,
  store,
  onStoryPage,
  player,
}: ActivePlayerProps & { player: NarrationPlayerState }) {
  // Every render: the story page's parts read the live state from here.
  useLayoutEffect(() => {
    store.set({ source, player });
  });
  useEffect(() => () => store.set(null), [store]);

  // In an effect, not the click: the player for this story didn't exist
  // yet. Twice under StrictMode's remount — harmless, play() restarts.
  const autoStart = useEffectEvent(() => {
    if (autoPlay) player.play();
  });
  useEffect(() => {
    autoStart();
  }, []);

  return (
    <StoryPlayerCapsule
      player={player}
      narration={source.narration}
      away={onStoryPage ? null : { title: source.title, href: source.href }}
    />
  );
}
