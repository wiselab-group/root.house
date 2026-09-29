"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivePlayer } from "./active-player";
import {
  createListeningStore,
  sourceKey,
  type ListenSource,
  type ListeningStore,
  type StorySource,
} from "./listening-store";

interface ListeningHostValue {
  store: ListeningStore;
  /** A story page opened: it becomes the player's story unless another
   *  one is playing or paused. */
  offer: (source: StorySource) => void;
  /** The story page closed — the player keeps its story. */
  withdraw: (storyId: string) => void;
  /** «Слушать» on a story, or a profile's voice, the player doesn't hold:
   *  switch and play. */
  start: (source: ListenSource) => void;
}

const ListeningHostContext = createContext<ListeningHostValue | null>(null);

export function useListeningHost(): ListeningHostValue | null {
  return useContext(ListeningHostContext);
}

/**
 * The «Слушать» player for a whole family (user request 2026-09-29: keep
 * listening while going about the app). It lives in the family layout, so
 * it outlives any one page: a story — or a voice from someone's profile —
 * keeps playing on the tree, in the archive, anywhere in the family, and
 * stops only on leaving the family. Story pages offer their story; the
 * capsule links back to it from elsewhere.
 */
export function ListeningHost({ children }: { children: ReactNode }) {
  const [store] = useState(createListeningStore);
  const [active, setActive] = useState<{
    source: ListenSource;
    autoPlay: boolean;
  } | null>(null);
  const [onPage, setOnPage] = useState<string | null>(null);

  const value = useMemo<ListeningHostValue>(
    () => ({
      store,
      offer(source) {
        setOnPage(source.storyId);
        setActive((current) => {
          if (!current) return { source, autoPlay: false };
          const same =
            current.source.kind === "story" &&
            current.source.storyId === source.storyId;
          const busy = store.get()?.player.status !== "idle";
          // Something else is playing or paused — it keeps the player.
          if (!same && busy) return current;
          // Same player (the page re-rendered, the text was edited): keep
          // it running with the fresh script. A new recording of the same
          // story, or an idle other story: replaced.
          return { source, autoPlay: false };
        });
      },
      withdraw(storyId) {
        setOnPage((current) => (current === storyId ? null : current));
      },
      start(source) {
        setActive({ source, autoPlay: true });
      },
    }),
    [store],
  );

  return (
    <ListeningHostContext.Provider value={value}>
      {children}
      {active && (
        <ActivePlayer
          key={sourceKey(active.source)}
          source={active.source}
          autoPlay={active.autoPlay}
          store={store}
          onStoryPage={
            active.source.kind === "story" && onPage === active.source.storyId
          }
        />
      )}
    </ListeningHostContext.Provider>
  );
}
