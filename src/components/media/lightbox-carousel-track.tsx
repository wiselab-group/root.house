"use client";

import { useEffect, useImperativeHandle, type Ref } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LightboxSlide } from "./lightbox-slide";
import { useSwipeNavigation, SWIPE_SETTLE_MS } from "./use-swipe-navigation";
import type { GalleryPhotoView } from "./gallery-photo";

/** Imperative escape hatch for PhotoLightbox's chevron buttons — see module doc. */
export type LightboxCarouselTrackHandle = {
  triggerStep: (direction: "prev" | "next") => void;
};

/**
 * The lightbox's actual sliding surface — prev/current/next photos mounted
 * side by side in a fixed 3-slot flex track (an empty slot renders where a
 * neighbor doesn't exist, at the first/last photo, so the track is always
 * exactly 3 equal-width slides and the resting `translateX(-100%)` always
 * lands on the middle one), the whole track translated to keep `current`
 * centered. See use-swipe-navigation.ts's module doc for why a track (not
 * a single `<img src>` swap): the neighbor is already painted and
 * positioned before a drag even starts, so a swipe is one continuous slide
 * instead of "old photo vanishes, blank gap, new photo pops in." Split out
 * of PhotoLightbox to keep that component under the 150-line limit — this
 * piece owns the whole drag/slide/settle lifecycle.
 *
 * The prev/next chevron buttons live in PhotoLightbox, not here — they must
 * be positioned against the full-screen lightbox, not inside a slide's own
 * `max-w-4xl` box (real bug: chevrons rendered inside the track drifted off
 * the screen edge on narrower photos), and they must sit outside the
 * `pointerHandlers`-bearing div below (real bug: a button nested inside it
 * had its pointerdown/pointerup swallowed by the drag gesture's
 * `setPointerCapture`, so clicking a chevron silently did nothing). Exposes
 * `triggerStep` via ref so PhotoLightbox's buttons still drive the same
 * settle animation as a swipe.
 */
export function LightboxCarouselTrack({
  ref,
  photos,
  index,
  onIndexChange,
  familyId,
  familySlug,
  taggingMode,
  canTag,
  highlightedPersonId,
}: {
  ref?: Ref<LightboxCarouselTrackHandle>;
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  familyId: string;
  familySlug: string;
  taggingMode: boolean;
  canTag: boolean;
  highlightedPersonId: string | null;
}) {
  const reducedMotion = useReducedMotion();

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const current = photos[index];

  const {
    dragOffsetPx,
    settleUnits,
    isDragging,
    suppressTransition,
    onSettleTransitionEnd,
    onSuppressedResetPainted,
    triggerStep,
    pointerHandlers,
  } = useSwipeNavigation({
    hasPrev,
    hasNext,
    onPrev: () => onIndexChange(index - 1),
    onNext: () => onIndexChange(index + 1),
    // Taps place tags in tagging mode (PhotoTagLayer) — swipe tracking
    // would fight that gesture, so it's off for the duration.
    disabled: taggingMode,
  });

  // Reduced motion: no follow-the-pointer/slide animation at all — a swipe
  // past the threshold (or a triggerStep call) jumps straight to the
  // neighbor, same as clicking a chevron does everywhere else.
  useImperativeHandle(
    ref,
    () => ({
      triggerStep: reducedMotion
        ? (direction) =>
            onIndexChange(direction === "next" ? index + 1 : index - 1)
        : triggerStep,
    }),
    [reducedMotion, triggerStep, onIndexChange, index],
  );

  // Turns the transition back on the frame *after* the transition-less
  // reset (settleUnits -> 0, index committed) has actually painted — see
  // use-swipe-navigation.ts's suppressTransition doc for why this can't
  // just happen in the same render as the reset.
  useEffect(() => {
    if (!suppressTransition) return;
    const raf = requestAnimationFrame(onSuppressedResetPainted);
    return () => cancelAnimationFrame(raf);
  }, [suppressTransition, onSuppressedResetPainted]);

  if (!current) return null;

  if (reducedMotion) {
    return (
      <div className="relative h-full w-full max-w-4xl px-4">
        <LightboxSlide
          photo={current}
          familyId={familyId}
          familySlug={familySlug}
          taggingMode={taggingMode}
          canTag={canTag}
          highlightedPersonId={highlightedPersonId}
        />
      </div>
    );
  }

  const isSettling = settleUnits !== 0;
  const canDrag = hasPrev || hasNext;

  return (
    // Full-width track, each slide the whole screen wide with the photo
    // itself capped at max-w-4xl inside it (see TrackSlot): at rest the
    // neighbors lie entirely past the screen edges — nothing shows beside
    // the current photo — and a swipe carries the photo all the way off the
    // screen instead of cutting it at a box edge (user request, both).
    <div
      className="relative h-full w-full touch-pan-y select-none"
      style={{
        cursor: !canDrag ? undefined : isDragging ? "grabbing" : "grab",
      }}
      {...pointerHandlers}
    >
      <div
        className={cn(
          "flex h-full w-full",
          !isDragging &&
            !suppressTransition &&
            "transition-transform ease-(--ease-transition)",
        )}
        style={{
          transform: `translateX(calc((${settleUnits} - 1) * 100% + ${dragOffsetPx}px))`,
          transitionDuration:
            isDragging || suppressTransition
              ? undefined
              : `${SWIPE_SETTLE_MS}ms`,
        }}
        onTransitionEnd={() => {
          if (isSettling) onSettleTransitionEnd();
        }}
      >
        <TrackSlot
          photo={hasPrev ? photos[index - 1] : undefined}
          familyId={familyId}
          familySlug={familySlug}
        />
        <TrackSlot
          photo={current}
          familyId={familyId}
          familySlug={familySlug}
          taggingMode={taggingMode}
          canTag={canTag}
          highlightedPersonId={highlightedPersonId}
        />
        <TrackSlot
          photo={hasNext ? photos[index + 1] : undefined}
          familyId={familyId}
          familySlug={familySlug}
        />
      </div>
    </div>
  );
}

function TrackSlot({
  photo,
  familyId,
  familySlug,
  taggingMode = false,
  canTag = false,
  highlightedPersonId = null,
}: {
  photo: GalleryPhotoView | undefined;
  familyId: string;
  familySlug: string;
  taggingMode?: boolean;
  canTag?: boolean;
  highlightedPersonId?: string | null;
}) {
  return (
    // The side padding lives in each slide, not on the lightbox around the
    // track — there it left a 16px strip where the neighbor's edge peeked in.
    <div className="flex h-full w-full shrink-0 justify-center px-4">
      <div className="relative h-full w-full max-w-4xl">
        {photo && (
          <LightboxSlide
            photo={photo}
            familyId={familyId}
            familySlug={familySlug}
            taggingMode={taggingMode}
            canTag={canTag}
            highlightedPersonId={highlightedPersonId}
          />
        )}
      </div>
    </div>
  );
}
