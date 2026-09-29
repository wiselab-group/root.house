"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { GalleryPhotoView } from "./gallery-photo";
import { LightboxPersonChip } from "./lightbox-person-chip";
import { LightboxPeopleList } from "./lightbox-people-list";
import { useScrollEdges } from "./use-scroll-edges";

type TaggedPerson = GalleryPhotoView["people"][number];

const NUDGE_SEEN_KEY = "root-house:lightbox-strip-nudge";

function nudgeSeen(): boolean {
  try {
    return window.localStorage.getItem(NUDGE_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markNudgeSeen() {
  try {
    window.localStorage.setItem(NUDGE_SEEN_KEY, "1");
  } catch {
    // Private mode / blocked storage: the nudge just shows again next time.
  }
}

/**
 * Phone people row: full names, scrolled with the finger (user choice
 * 2026-09-29 over first-names-only or «+N»). It has to LOOK scrollable, so
 * three cues work together: the row fades out at the edge with more names
 * past it (a half-cut chip shows through the fade); a fixed «👤 N» chip on
 * the left says how many there are and opens the full list — only when the
 * names overflow; and the first time ever, the row slides left and back
 * once. The row scrolls on its own (touch-pan-x) — the photo's swipe lives
 * on the track above and never sees these touches.
 */
export function LightboxPeopleScroller({
  people,
  familySlug,
  highlightedPersonId,
  onHighlight,
}: {
  /** Already in left-to-right order. */
  people: TaggedPerson[];
  familySlug: string;
  highlightedPersonId: string | null;
  onHighlight: (personId: string | null) => void;
}) {
  const t = useTranslations("media");
  const reducedMotion = useReducedMotion();
  const signature = people.map((person) => person.id).join();
  const { ref, overflow, moreStart, moreEnd } = useScrollEdges(signature);
  const [nudge, setNudge] = useState(() => !nudgeSeen());
  const nudging = nudge && overflow && !reducedMotion;
  const stopNudge = () => {
    if (!nudge) return;
    setNudge(false);
    markNudgeSeen();
  };

  return (
    <div className="flex items-center gap-1.5 pl-3">
      {overflow && (
        <LightboxPeopleList
          people={people}
          familySlug={familySlug}
          touch
          trigger={
            <>
              <UsersIcon aria-hidden="true" className="size-4" />
              {people.length}
            </>
          }
          triggerLabel={t("showAllTagged", { count: people.length })}
          onHighlight={onHighlight}
        />
      )}
      <div
        ref={ref}
        onScroll={stopNudge}
        className={cn(
          "min-w-0 flex-1 touch-pan-x overflow-x-auto overscroll-x-contain scrollbar-none [&::-webkit-scrollbar]:hidden",
          // The nudge slides the first chip past the left edge too.
          (moreStart || nudging) && "mask-fade-start",
          moreEnd && "mask-fade-end",
        )}
      >
        <div
          className={cn(
            "flex w-max gap-1.5 pr-3",
            nudging && "animate-strip-nudge",
          )}
          onAnimationEnd={stopNudge}
        >
          {people.map((person) => (
            <LightboxPersonChip
              key={person.id}
              person={person}
              familySlug={familySlug}
              touch
              highlighted={highlightedPersonId === person.id}
              onHighlight={onHighlight}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
