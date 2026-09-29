"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

/**
 * False while the tab is in the background or the window is minimized
 * (Page Visibility API) — timers that show something, like the story
 * slideshow, hold instead of running where nobody sees them. SSR snapshot
 * is `true`.
 */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => true,
  );
}
