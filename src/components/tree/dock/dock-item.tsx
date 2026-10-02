"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ShowDockHint } from "./dock-tooltip";

/**
 * One icon in the tree dock. Desktop (fine pointer): a 40px round icon,
 * its name in the shared tooltip. Touch: icon over a short text label, one
 * cell of the dock's tab-bar grid — there's no hover to reveal a name.
 * `badge` is the terracotta dot for "this is on" (an active filter).
 */
export function DockItem({
  icon,
  label,
  shortLabel,
  shortcut,
  onClick,
  pressed,
  badge,
  onHint,
  className,
}: {
  icon: React.ReactNode;
  /** Full name — tooltip and aria-label. */
  label: string;
  /** Text under the icon on touch. */
  shortLabel: string;
  shortcut?: string;
  onClick: () => void;
  pressed?: boolean;
  badge?: boolean;
  onHint: ShowDockHint;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // A toggle item renames itself on click (show all ⇄ back) — refresh the
  // tooltip the pointer is still resting on instead of showing the old name.
  useEffect(() => {
    const item = ref.current;
    if (item?.matches(":hover, :focus-visible")) onHint(item, label, shortcut);
  }, [label, shortcut, onHint]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      onPointerEnter={(e) => onHint(e.currentTarget, label, shortcut)}
      onFocus={(e) => onHint(e.currentTarget, label, shortcut)}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 pt-2 pb-1.5 text-foreground outline-none select-none",
        "transition-[background-color,color,transform] duration-base ease-(--ease-reveal) hover:bg-foreground/8 active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-ring",
        "aria-pressed:text-primary md:pointer-fine:size-10 md:pointer-fine:rounded-full md:pointer-fine:p-0",
        className,
      )}
    >
      <span className="relative flex [&_svg]:size-5 [&_svg]:fill-none! md:pointer-fine:[&_svg]:size-[1.125rem]">
        {icon}
        <span
          aria-hidden
          className={cn(
            "absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-background transition-transform duration-slow ease-(--ease-spring)",
            badge ? "scale-100" : "scale-0",
          )}
        />
      </span>
      <span className="text-[0.7rem] leading-none font-medium md:pointer-fine:sr-only">
        {shortLabel}
      </span>
    </button>
  );
}
