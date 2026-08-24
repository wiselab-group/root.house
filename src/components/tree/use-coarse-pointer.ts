"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * True on touch/coarse-pointer devices (phones, tablets) — same signal the
 * CSS `pointer-coarse:` variant uses elsewhere in the tree (MiniMap
 * visibility, control button sizing), but as a live JS value for props that
 * can't be conditioned by a CSS class, like ReactFlow's `Controls
 * showZoom`. SSR snapshot is `false` (desktop-shaped) so hydration matches;
 * the real value replaces it on mount, same pattern as useTreeCardStyle.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
