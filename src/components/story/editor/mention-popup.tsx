"use client";

import { useTranslations } from "next-intl";
import { useEffect, useReducer } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { PersonThumb } from "@/components/person/person-thumb";
import type { MentionState } from "./use-mention-suggestion";

const WIDTH = 288;

/**
 * The «@» list under the caret: the family's people as every person picker
 * shows them (portrait, name, life years). Clicking keeps the editor's
 * focus (mousedown is prevented), so the name lands where it was typed.
 */
export function MentionPopup({
  familyId,
  state,
  onHover,
}: {
  familyId: string;
  state: MentionState | null;
  onHover: (index: number) => void;
}) {
  const t = useTranslations("storyForm");
  // Follow the caret when the page scrolls or resizes under the open list.
  const [, remeasure] = useReducer((n: number) => n + 1, 0);
  const open = state !== null;
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", remeasure, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", remeasure);
    return () => {
      window.removeEventListener("scroll", remeasure, { capture: true });
      window.removeEventListener("resize", remeasure);
    };
  }, [open]);

  const rect = state?.getRect();
  if (!state || !rect) return null;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - WIDTH - 8));

  return createPortal(
    <div
      style={{ top: rect.bottom + 6, left, width: WIDTH }}
      className="fixed z-50 animate-in overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-instant fade-in-0 zoom-in-95"
    >
      {state.items.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-muted-foreground">
          {t("mentionEmpty")}
        </p>
      ) : (
        <ul role="listbox" aria-label={t("mentionListLabel")}>
          {state.items.map((person, index) => (
            <li
              key={person.id}
              role="option"
              aria-selected={index === state.index}
              onMouseDown={(event) => {
                event.preventDefault();
                state.select(person);
              }}
              onMouseEnter={() => onHover(index)}
              className={cn(
                "flex cursor-default items-center gap-3 px-3 py-2 text-sm select-none",
                index === state.index && "bg-accent text-accent-foreground",
              )}
            >
              <PersonThumb
                person={person.thumb}
                familyId={familyId}
                size="sm"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{person.name}</span>
                {person.years && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {person.years}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}
