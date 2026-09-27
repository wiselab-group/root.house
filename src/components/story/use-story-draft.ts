"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  parseDraft,
  readDraftRaw,
  removeDraft,
  subscribeDrafts,
  writeDraft,
  type StoryDraft,
} from "./story-draft-store";

/** Pause after the last keystroke before the draft is written. A debounce,
 *  not an animation delay. */
const AUTOSAVE_DELAY_MS = 800;

/**
 * Title/body state for the story editor plus its local draft: autosaves
 * edits that differ from the published version, and surfaces a draft left
 * over from an earlier visit (a closed tab, a crash) until the user either
 * restores or discards it — or starts typing, which supersedes it.
 */
export function useStoryDraft(storyId: string, saved: StoryDraft) {
  const [title, setTitle] = useState(saved.title);
  const [body, setBody] = useState(saved.body);

  const raw = useSyncExternalStore(
    subscribeDrafts,
    () => readDraftRaw(storyId),
    () => null,
  );
  const draft = parseDraft(raw);

  const edited = title !== saved.title || body !== saved.body;
  const draftDiffersFromSaved =
    draft !== null &&
    (draft.title !== saved.title || draft.body !== saved.body);

  useEffect(() => {
    if (!edited) return;
    const id = window.setTimeout(
      () => writeDraft(storyId, { title, body }),
      AUTOSAVE_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [storyId, title, body, edited]);

  const restore = useCallback(() => {
    if (!draft) return;
    setTitle(draft.title);
    setBody(draft.body);
  }, [draft]);

  const discard = useCallback(() => removeDraft(storyId), [storyId]);

  return {
    title,
    setTitle,
    body,
    setBody,
    /** A draft from an earlier visit, offered until the user edits. */
    leftoverDraft: !edited && draftDiffersFromSaved ? draft : null,
    /** The current edits are safely stored on this device. */
    draftSaved:
      edited && draft !== null && draft.title === title && draft.body === body,
    restore,
    discard,
  };
}
