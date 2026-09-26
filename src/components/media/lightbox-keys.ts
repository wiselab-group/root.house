import type { KeyboardEvent } from "react";

/**
 * ←/→ page through the photos, same as the chevrons. Not while the key
 * belongs to something else: typing in the tag-person search, moving
 * through an open menu/listbox (those portal out of the dialog in the DOM
 * but React still bubbles their keys up here), or with a modifier held.
 */
export function arrowStep(event: KeyboardEvent): "prev" | "next" | null {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return null;
  if (event.defaultPrevented || event.altKey || event.metaKey) return null;
  if (event.ctrlKey || event.shiftKey) return null;
  const target = event.target as HTMLElement;
  if (
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [role=menu], [role=listbox], [role=combobox], [role=slider]",
    )
  ) {
    return null;
  }
  return event.key === "ArrowLeft" ? "prev" : "next";
}
