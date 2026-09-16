"use client";

import Image from "next/image";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { PhotoTagLayer } from "./photo-tag-layer";
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
 * be positioned against the full-screen lightbox, not this track's own
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
      <div className="relative h-full w-full max-w-4xl">
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
    <div
      className="relative h-full w-full max-w-4xl touch-pan-y select-none"
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
    <div className="relative h-full w-full shrink-0">
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
  );
}

function LightboxSlide({
  photo,
  familyId,
  familySlug,
  taggingMode,
  canTag,
  highlightedPersonId,
}: {
  photo: GalleryPhotoView;
  familyId: string;
  familySlug: string;
  taggingMode: boolean;
  canTag: boolean;
  highlightedPersonId: string | null;
}) {
  // No media.width/height in the data (see PhotoTagLayer's own doc comment)
  // — the actual object-contain rectangle (which can letterbox top/bottom
  // or left/right depending on aspect ratio) is only knowable once the
  // image has actually decoded. Only measured while taggingMode is on: the
  // frame it drives is purely a tagging-mode affordance, so plain viewing
  // does the usual zero-JS fill+object-contain with no ResizeObserver cost.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containRect, setContainRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  // "Adjust state during rendering" (not in an effect) to drop a stale
  // rect the instant `photo` changes — an effect-only reset would still
  // paint one frame with the previous photo's frame before it ran.
  const [measuredForId, setMeasuredForId] = useState(photo.media.id);
  if (measuredForId !== photo.media.id) {
    setMeasuredForId(photo.media.id);
    if (containRect) setContainRect(null);
  }

  function recomputeContainRect(naturalWidth: number, naturalHeight: number) {
    const container = containerRef.current;
    if (!container || !naturalWidth || !naturalHeight) return;
    const { width: cw, height: ch } = container.getBoundingClientRect();
    const scale = Math.min(cw / naturalWidth, ch / naturalHeight);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    setContainRect({
      left: (cw - width) / 2,
      top: (ch - height) / 2,
      width,
      height,
    });
  }

  useEffect(() => {
    if (!taggingMode) return;
    const img = containerRef.current?.querySelector("img");
    // next/image reuses the same <img> DOM node across a src change (the
    // slide component doesn't remount on next/prev) — right after `src`
    // changes, `img.complete`/`naturalWidth` can still briefly reflect the
    // *previous* photo until the browser actually starts loading the new
    // one. Requiring currentSrc to already match the new photo's URL is
    // what rules that stale read out; the real bug this guards (caught on
    // a real screenshot) was the frame settling on the wrong aspect ratio
    // after clicking next/prev in tagging mode.
    if (
      img?.complete &&
      img.naturalWidth &&
      img.currentSrc.includes(photo.media.id)
    ) {
      recomputeContainRect(img.naturalWidth, img.naturalHeight);
    }
    function onResize() {
      if (img?.naturalWidth) {
        recomputeContainRect(img.naturalWidth, img.naturalHeight);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [taggingMode, photo.media.id]);

  return (
    <div ref={containerRef} className="relative size-full">
      <Image
        src={`/api/media/${photo.media.id}?familyId=${familyId}`}
        alt={photo.media.title ?? "Семейное фото"}
        fill
        sizes="100vw"
        className="object-contain"
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        unoptimized
        onLoad={(e) => {
          const img = e.currentTarget;
          if (taggingMode) {
            recomputeContainRect(img.naturalWidth, img.naturalHeight);
          }
        }}
      />
      {taggingMode && containRect && (
        <div
          aria-hidden
          className="pointer-events-none absolute ring-3 ring-inset ring-primary"
          style={{
            left: containRect.left,
            top: containRect.top,
            width: containRect.width,
            height: containRect.height,
          }}
        />
      )}
      <PhotoTagLayer
        mediaId={photo.media.id}
        people={photo.people}
        taggingMode={taggingMode}
        canTag={canTag}
        familyId={familyId}
        familySlug={familySlug}
        highlightedPersonId={highlightedPersonId}
      />
    </div>
  );
}
