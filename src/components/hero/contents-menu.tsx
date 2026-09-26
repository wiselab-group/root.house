"use client";

import { useEffect, useRef, useState } from "react";
import { ListIcon } from "lucide-react";
import { glassPill, glassSurface } from "./glass";

export interface ContentsMenuItem {
  id: string;
  label: string;
  /** Trailing detail — a section's item count, a chapter's number. */
  aside?: string | number;
  current?: boolean;
}

/**
 * The glass «Содержание» pill from the reference screenshots: opens a small
 * menu of in-page anchor links. Used by the Person Profile on phones (where
 * sections are one long scroll instead of tabs) and by the Story page for
 * its chapters, where `buttonLabel` shows the chapter being read.
 */
export function ContentsMenu({
  items,
  menuId,
  menuLabel,
  buttonLabel = "Содержание",
}: {
  items: ContentsMenuItem[];
  menuId: string;
  menuLabel: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // A tap or click anywhere outside the pill and its menu closes it, like
  // any popover — only Escape and picking an item used to.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className={`${glassPill} max-w-[80vw]`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <ListIcon aria-hidden="true" />
        <span className="truncate">{buttonLabel}</span>
      </button>
      <nav
        id={menuId}
        aria-label={menuLabel}
        className={`${glassSurface} absolute top-12 left-1/2 grid w-72 max-w-[86vw] -translate-x-1/2 rounded-2xl bg-popover/85 p-1.5 transition-[opacity,transform] duration-200 ease-(--ease-reveal) ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            tabIndex={open ? 0 : -1}
            aria-current={item.current ? "true" : undefined}
            onClick={() => setOpen(false)}
            className="flex justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/70 hover:bg-glass-strong hover:text-foreground aria-[current=true]:bg-glass aria-[current=true]:text-foreground"
          >
            {item.label}
            {item.aside !== undefined && (
              <span className="text-foreground/45 tabular-nums">
                {item.aside}
              </span>
            )}
          </a>
        ))}
      </nav>
    </div>
  );
}
