"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export interface ScriptBlock {
  block: string;
  text: string;
  heading: boolean;
}

/**
 * The story's text as a teleprompter while recording it: every block in
 * reading order, the one being read lit (terracotta tint, the same as the
 * listening highlight), the ones already read dimmed. The list scrolls
 * itself — only itself, never the page — to keep the current block a
 * third of the way down.
 */
export function RecorderScript({
  blocks,
  current,
  active,
}: {
  blocks: ScriptBlock[];
  current: number;
  /** Before recording starts nothing is lit or dimmed. */
  active: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-script="${current}"]`);
    if (!list || !el || !active) return;
    list.scrollTo({
      top: el.offsetTop - list.clientHeight / 3,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [current, active, reducedMotion]);

  return (
    <div
      ref={listRef}
      className="relative min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {blocks.map((item, index) => (
          <p
            key={item.block}
            data-script={index}
            aria-current={active && index === current ? "step" : undefined}
            className={cn(
              "-mx-4 rounded-xl px-4 py-2 text-pretty transition-[opacity,background-color] duration-base ease-(--ease-reveal) motion-reduce:transition-none",
              item.heading
                ? "font-heading text-2xl leading-snug sm:text-3xl"
                : "font-heading text-lg leading-relaxed sm:text-xl",
              active && index === current && "bg-primary/10 text-foreground",
              active && index < current && "opacity-40",
            )}
          >
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}
