"use client";

import { useEffect, useEffectEvent, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import type {
  ListenSource,
  ListeningStore,
  StorySource,
  VoiceClipSource,
} from "./listening-store";
import type { NarrationPlayerState } from "./narration-types";
import {
  StoryPlayerCapsule,
  type CapsuleHeading,
} from "./story-player-capsule";
import { useRecordingNarration } from "./use-recording-narration";
import { useSpeechNarration } from "./use-speech-narration";
import { useVoiceClip } from "./use-voice-clip";

interface ActivePlayerProps<S extends ListenSource = ListenSource> {
  source: S;
  /** Start playing on mount — «Слушать» pressed on something the player
   *  didn't hold yet. */
  autoPlay: boolean;
  store: ListeningStore;
  /** On the story's own page the capsule shows the chapter; elsewhere,
   *  the story's title, linking back. */
  onStoryPage: boolean;
}

const storageKey = (source: StorySource) =>
  `root-house:story-listen:${source.storyId}`;

/** The player of ListeningHost's current source: a profile's voice, a
 *  family member's recording of a story, or the device's voice reading
 *  it. Keyed by the source — a new one is a fresh player. */
export function ActivePlayer({ source, ...props }: ActivePlayerProps) {
  if (source.kind === "voice") return <ClipPlayer {...props} source={source} />;
  return source.recording ? (
    <RecordingPlayer {...props} source={source} />
  ) : (
    <VoicePlayer {...props} source={source} />
  );
}

function ClipPlayer(props: ActivePlayerProps<VoiceClipSource>) {
  const player = useVoiceClip(props.source);
  const { title, href, subtitle } = props.source;
  return (
    <Publish {...props} player={player} heading={{ title, href, subtitle }} />
  );
}

function VoicePlayer(props: ActivePlayerProps<StorySource>) {
  const player = useSpeechNarration(
    props.source.narration,
    storageKey(props.source),
  );
  return <StoryPublish {...props} player={player} />;
}

function RecordingPlayer(props: ActivePlayerProps<StorySource>) {
  const { source } = props;
  // ActivePlayer only renders this when there is a recording.
  const recording = source.recording as NonNullable<StorySource["recording"]>;
  const player = useRecordingNarration(
    source.narration,
    recording,
    `${storageKey(source)}:${recording.mediaId}`,
  );
  return <StoryPublish {...props} player={player} />;
}

/** A story's capsule line: the chapter being read on its own page, the
 *  story's title (a link back) elsewhere — then whose voice it is. */
function StoryPublish(
  props: ActivePlayerProps<StorySource> & { player: NarrationPlayerState },
) {
  const t = useTranslations("stories");
  const { source, player, onStoryPage } = props;
  const { narration } = source;
  const phrase = narration.phrases[player.index];
  const chapter = narration.chapters.find((c) => c.number === phrase?.chapter);
  const subtitle =
    player.source === "voice"
      ? t("listenDeviceVoice")
      : player.recordedByName
        ? t("listenReadBy", { name: player.recordedByName })
        : t("listenRecording");
  const heading: CapsuleHeading = onStoryPage
    ? { title: chapter?.title ?? t("listenOpening"), href: null, subtitle }
    : { title: source.title, href: source.href, subtitle };
  return <Publish {...props} heading={heading} />;
}

function Publish({
  source,
  autoPlay,
  store,
  player,
  heading,
}: ActivePlayerProps & {
  player: NarrationPlayerState;
  heading: CapsuleHeading;
}) {
  // Every render: the page parts showing the player read its live state
  // from here.
  useLayoutEffect(() => {
    store.set({ source, player });
  });
  useEffect(() => () => store.set(null), [store]);

  // In an effect, not the click: the player for this source didn't exist
  // yet. Twice under StrictMode's remount — harmless, play() restarts.
  const autoStart = useEffectEvent(() => {
    if (autoPlay) player.play();
  });
  useEffect(() => {
    autoStart();
  }, []);

  return <StoryPlayerCapsule player={player} heading={heading} />;
}
