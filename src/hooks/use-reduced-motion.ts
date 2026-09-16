"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * True when the user has requested reduced motion at the OS/browser level —
 * globals.css's own `@media (prefers-reduced-motion: reduce)` block already
 * handles every CSS transition/animation in the app, but any JS-driven
 * motion (not a CSS transition) needs this live value to skip its own
 * animated path instead (an instant jump/snap, same as CLAUDE.md's
 * ANIMATION RULES require for every other motion in the app) — e.g.
 * XYFlow's `setCenter`/`fitView` viewport pan-and-zoom (tree-canvas.tsx's
 * InitialFocusViewport/focus-switch animation) and the photo lightbox's
 * touch-swipe drag-follow (photo-lightbox.tsx). SSR snapshot is `false` so
 * hydration matches; the real value replaces it on mount, same pattern as
 * use-coarse-pointer.ts.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
