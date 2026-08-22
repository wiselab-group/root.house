"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TreeCardStyle = "compact" | "portrait";

const STORAGE_KEY = "root-house:tree-card-style";

function isTreeCardStyle(value: string | null): value is TreeCardStyle {
  return value === "compact" || value === "portrait";
}

function readStoredStyle(): TreeCardStyle {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTreeCardStyle(stored) ? stored : "compact";
  } catch {
    // Private browsing / storage disabled — fall back to the default silently.
    return "compact";
  }
}

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

/**
 * Persists the user's preferred tree-node presentation across visits (per
 * browser, not per family — this is a viewing preference, not domain data).
 * SSR snapshot is the "compact" default so the very first client render
 * matches the server's, then useSyncExternalStore re-reads localStorage —
 * same pattern as FamilySlugSettings' origin read, for the same hydration-
 * mismatch reason (see that component's doc comment).
 */
export function useTreeCardStyle(): [
  TreeCardStyle,
  (style: TreeCardStyle) => void,
] {
  const style = useSyncExternalStore<TreeCardStyle>(
    subscribe,
    readStoredStyle,
    () => "compact",
  );

  const setStyle = useCallback((next: TreeCardStyle) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort — the toggle still works for the current session via the listener below.
    }
    notifyListeners();
  }, []);

  return [style, setStyle];
}
