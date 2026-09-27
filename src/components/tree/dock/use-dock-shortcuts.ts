"use client";

import { useEffect, useRef } from "react";

export type DockAction = "filter" | "fit" | "kinship";

/** Physical key codes, so the shortcuts work the same on a Russian layout. */
const CODE_TO_ACTION: Record<string, DockAction> = {
  KeyF: "filter",
  Digit0: "fit",
  KeyR: "kinship",
};

export const DOCK_SHORTCUT_LABELS: Record<DockAction, string> = {
  filter: "F",
  fit: "0",
  kinship: "R",
};

/**
 * Single-key shortcuts for the tree dock. Ignored while typing (inputs,
 * textareas, contenteditable), inside a dialog, with a modifier held, or
 * on key repeat. Actions missing from `actions` (the read-only Share Link
 * tree has no filter/kinship) simply don't bind.
 */
export function useDockShortcuts(
  actions: Partial<Record<DockAction, () => void>>,
) {
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [role='dialog']"))
      )
        return;
      const action = CODE_TO_ACTION[event.code];
      const run = action ? actionsRef.current[action] : undefined;
      if (!run) return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
