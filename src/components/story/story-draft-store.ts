"use client";

/**
 * Local, per-device drafts for the story editor — a safety net while
 * writing, not a server-side draft state (stories have none). Stored in
 * localStorage under one key per story; every access is guarded because
 * storage can be missing or throw (private mode, blocked site data).
 *
 * Exposed as a tiny external store so components read it through
 * useSyncExternalStore: the server snapshot is always null, so hydration
 * never mismatches, and our own writes notify subscribers (the native
 * `storage` event only fires in OTHER tabs).
 */
export interface StoryDraft {
  title: string;
  body: string;
}

const listeners = new Set<() => void>();

function keyFor(storyId: string) {
  return `root-house:story-draft:${storyId}`;
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeDrafts(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The raw stored string — a primitive, so useSyncExternalStore's
 *  identity check doesn't re-render on every read. */
export function readDraftRaw(storyId: string): string | null {
  try {
    return window.localStorage.getItem(keyFor(storyId));
  } catch {
    return null;
  }
}

export function parseDraft(raw: string | null): StoryDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "title" in value &&
      "body" in value &&
      typeof value.title === "string" &&
      typeof value.body === "string"
    ) {
      return { title: value.title, body: value.body };
    }
  } catch {
    // Corrupt entry — treated as no draft.
  }
  return null;
}

export function writeDraft(storyId: string, draft: StoryDraft) {
  try {
    window.localStorage.setItem(keyFor(storyId), JSON.stringify(draft));
    notify();
  } catch {
    // Storage full or blocked — the editor keeps working without drafts.
  }
}

export function removeDraft(storyId: string) {
  try {
    window.localStorage.removeItem(keyFor(storyId));
    notify();
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
