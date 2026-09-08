"use client";

import { useSyncExternalStore } from "react";

// Never actually changes after subscribe — there is no "unmount" event to
// notify on, so the store is inert; this only exists to give
// useSyncExternalStore's getSnapshot (true, post-hydration) vs.
// getServerSnapshot (false) split, same shape as useCoarsePointer.
function subscribe(): () => void {
  return () => {};
}

/**
 * True once the component has hydrated on the client, false during SSR and
 * the very first client render — same "SSR snapshot fixed, real value
 * replaces it on mount" pattern as useCoarsePointer/useTreeCardStyle,
 * preferred here over a useEffect(() => setState(true), []) specifically
 * because that pattern trips the set-state-in-effect lint rule (a
 * synchronous setState inside an effect body) even though it's the correct,
 * intentional "isClient" idiom — useSyncExternalStore is the React-blessed
 * way to express exactly this without an effect-driven state update.
 *
 * Used to defer mounting @xyflow/react's own <MiniMap>, which picks its
 * shapeRendering attribute from `typeof window === 'undefined'` at render
 * time (a hydration-mismatch bug inside the library itself, not something
 * fixable from here) — see tree-canvas.tsx.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
