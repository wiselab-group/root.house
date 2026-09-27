"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { glassSurface } from "@/components/hero/glass";
import type { ProfilePanel } from "./profile-tabs";

interface Inset {
  left: number;
  right: number;
}

const TAB_CLASS =
  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium";

/**
 * Desktop tab strip with a sliding pill (user request 2026-09-27, after
 * 21st.dev «slide-tabs»): on click the pill slides to the newly active tab.
 * Hover keeps the plain soft fill — the user wanted motion on click only.
 *
 * The pill is an inverted copy of the whole strip (bg-foreground,
 * text-background) clipped to one tab's box — animating `clip-path` instead
 * of left/width keeps it off layout, and the label colour flips exactly at
 * the pill's edge mid-slide rather than cross-fading per button.
 */
export function ProfileTabList({
  panels,
  active,
  label,
  onSelect,
  onKeyDown,
  tabRefs,
}: {
  panels: ProfilePanel[];
  active: string | undefined;
  label: string;
  onSelect: (id: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  tabRefs: React.RefObject<Map<string, HTMLButtonElement>>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState<Map<string, Inset> | null>(null);
  // No slide on the first measurement — the pill should appear in place.
  const [ready, setReady] = useState(false);

  // Re-measure whenever the strip resizes (web fonts landing, counts
  // changing, locale switch) so the pill never drifts off its tab.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const next = new Map<string, Inset>();
      for (const [id, el] of tabRefs.current) {
        next.set(id, {
          left: el.offsetLeft,
          right: list.clientWidth - el.offsetLeft - el.offsetWidth,
        });
      }
      setInsets(next);
    };
    measure();
    const frame = requestAnimationFrame(() => setReady(true));
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [panels, tabRefs]);

  const target = active ? insets?.get(active) : undefined;
  const clipPath = target
    ? `inset(6px ${target.right}px 6px ${target.left}px round 9999px)`
    : "inset(50%)";

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`${glassSurface} relative hidden gap-1.5 rounded-full p-1.5 md:flex`}
    >
      {panels.map((panel) => {
        const selected = panel.id === active;
        return (
          <button
            key={panel.id}
            ref={(el) => {
              if (el) tabRefs.current.set(panel.id, el);
              else tabRefs.current.delete(panel.id);
            }}
            type="button"
            role="tab"
            id={`tab-${panel.id}`}
            aria-selected={selected}
            aria-controls={panel.id}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(panel.id)}
            className={`${TAB_CLASS} cursor-pointer transition-colors duration-slow ease-(--ease-reveal) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none text-foreground/65 ${
              selected ? "" : "hover:bg-foreground/8 hover:text-foreground"
            }`}
          >
            {panel.label}
            {Boolean(panel.count) && (
              <span className="text-xs text-foreground/40 tabular-nums">
                {panel.count}
              </span>
            )}
          </button>
        );
      })}

      {/* The pill: same flex/padding/gap as the strip, so each copied label
          sits pixel-exact over its real button. */}
      <div
        aria-hidden
        style={{ clipPath }}
        className={`pointer-events-none absolute inset-0 flex gap-1.5 rounded-full bg-foreground p-1.5 text-background ease-(--ease-spring) motion-reduce:transition-none ${
          ready ? "transition-[clip-path] duration-slow" : ""
        }`}
      >
        {panels.map((panel) => (
          <span key={panel.id} className={TAB_CLASS}>
            {panel.label}
            {Boolean(panel.count) && (
              <span className="text-xs text-background/60 tabular-nums">
                {panel.count}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
