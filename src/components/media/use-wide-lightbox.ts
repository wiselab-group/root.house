"use client";

import { useSyncExternalStore } from "react";

/** Same split as the CSS `md:pointer-fine:` variant used across the lightbox. */
const QUERY = "(pointer: fine) and (min-width: 48rem)";

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

/**
 * True for the desktop lightbox (mouse + a wide window): caption in the top
 * bar, a filmstrip tab and fit-to-width name chips in the bottom strip.
 * False on phones and tablets, where the strip is people only and scrolls
 * with the finger. SSR snapshot is `false`; the lightbox only ever opens
 * after a click, so there's no hydrated markup to mismatch.
 */
export function useWideLightbox(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
