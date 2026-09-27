"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  autosaveStoryAction,
  discardStoryDraftAction,
} from "@/actions/story.actions";

/** Pause after the last keystroke before the draft is sent. A debounce,
 *  not an animation delay. */
const AUTOSAVE_DELAY_MS = 1500;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface Content {
  title: string;
  body: string;
}

/**
 * Title/body state for the story editor, autosaved to the server
 * (autosaveStoryAction) so work in progress follows the writer to any
 * device. `saved` is the story as the family reads it; `serverDraft` is this
 * user's autosaved edits to a PUBLISHED story from an earlier visit — offered
 * (restore/discard) until the user starts typing, which supersedes it. For a
 * story that is itself still a draft there's nothing to offer: its own
 * title/body already are the latest autosave.
 *
 * Only the newest request may set the status (a slow earlier save can't
 * overwrite a newer «saved» with a stale one), and `cancelPending` stops a
 * queued autosave when the form is submitted for real.
 */
export function useStoryAutosave({
  familyId,
  storyId,
  saved,
  serverDraft,
}: {
  familyId: string;
  storyId: string;
  saved: Content;
  serverDraft: Content | null;
}) {
  const [title, setTitle] = useState(saved.title);
  const [body, setBody] = useState(saved.body);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [offeredDraft, setOfferedDraft] = useState(
    serverDraft &&
      (serverDraft.title !== saved.title || serverDraft.body !== saved.body)
      ? serverDraft
      : null,
  );
  const persisted = useRef<Content>(saved);
  const timer = useRef<number | null>(null);
  const latestRequest = useRef(0);

  const cancelPending = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    latestRequest.current += 1;
  }, []);

  useEffect(() => {
    const content = { title, body };
    if (
      content.title === persisted.current.title &&
      content.body === persisted.current.body
    ) {
      return;
    }
    timer.current = window.setTimeout(async () => {
      timer.current = null;
      const request = ++latestRequest.current;
      setStatus("saving");
      const result = await autosaveStoryAction(
        familyId,
        storyId,
        content,
      ).catch(() => ({ ok: false as const, error: "" }));
      if (request !== latestRequest.current) return;
      if (result.ok) persisted.current = content;
      setStatus(result.ok ? "saved" : "error");
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [familyId, storyId, title, body]);

  const edit = useCallback((field: keyof Content, value: string) => {
    setOfferedDraft(null);
    if (field === "title") setTitle(value);
    else setBody(value);
  }, []);

  const restore = useCallback(() => {
    if (!offeredDraft) return;
    setTitle(offeredDraft.title);
    setBody(offeredDraft.body);
    // Already on the server — no need to autosave it straight back.
    persisted.current = offeredDraft;
    setOfferedDraft(null);
    setStatus("saved");
  }, [offeredDraft]);

  const discard = useCallback(() => {
    setOfferedDraft(null);
    void discardStoryDraftAction(familyId, storyId);
  }, [familyId, storyId]);

  return {
    title,
    body,
    setTitle: (value: string) => edit("title", value),
    setBody: (value: string) => edit("body", value),
    status,
    offeredDraft,
    restore,
    discard,
    cancelPending,
  };
}
