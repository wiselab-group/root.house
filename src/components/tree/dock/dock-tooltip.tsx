"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface DockHint {
  label: string;
  shortcut?: string;
  /** Center of the hovered item, in px from the dock's left edge. */
  x: number;
  visible: boolean;
  /** Was a hint already showing? Then travel from there; otherwise appear in place. */
  glide: boolean;
}

export type ShowDockHint = (
  item: HTMLElement,
  label: string,
  shortcut?: string,
) => void;

/**
 * State for the dock's ONE shared tooltip. Hovering the next item moves the
 * same tooltip over (glide) instead of fading one out and another in —
 * the Vercel-toolbar feel the user picked (skiper43). Hiding keeps the last
 * position, so the fade-out happens where the tooltip was.
 */
export function useDockHint() {
  const [hint, setHint] = useState<DockHint | null>(null);

  const show = useCallback<ShowDockHint>((item, label, shortcut) => {
    setHint((prev) => ({
      label,
      shortcut,
      x: item.offsetLeft + item.offsetWidth / 2,
      visible: true,
      glide: Boolean(prev?.visible),
    }));
  }, []);

  const hide = useCallback(() => {
    setHint((prev) => (prev ? { ...prev, visible: false } : prev));
  }, []);

  return { hint, show, hide };
}

/**
 * Pointer-fine only (a touch tap would fire it as a stray hover); on touch
 * the dock shows text labels instead. aria-hidden: every item already has
 * its own aria-label and aria-keyshortcuts, this is a visual duplicate.
 */
export function DockTooltip({ hint }: { hint: DockHint | null }) {
  if (!hint) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute bottom-full left-0 mb-2.5 hidden items-center gap-2 rounded-lg bg-foreground px-2.5 py-1.5 has-[kbd]:pr-1.5 text-xs font-medium whitespace-nowrap text-background shadow-lg md:pointer-fine:flex",
        hint.glide
          ? "transition-[transform,opacity] duration-reveal ease-(--ease-spring)"
          : "transition-opacity duration-fast ease-(--ease-reveal)",
        hint.visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        transform: `translateX(${hint.x}px) translateX(-50%) translateY(${hint.visible ? 0 : 4}px)`,
      }}
    >
      {hint.label}
      {hint.shortcut && (
        <kbd className="rounded-md bg-background/15 px-1.5 py-0.5 font-sans text-[0.7rem] font-semibold">
          {hint.shortcut}
        </kbd>
      )}
    </div>
  );
}
