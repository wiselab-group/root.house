"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { personDisplayName } from "@/domain/person/display-name";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { PhotoTagLayer } from "./photo-tag-layer";
import { useSwipeNavigation } from "./use-swipe-navigation";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * Full-screen photo viewer for the family gallery — built directly on
 * @base-ui/react/dialog (not the centered ui/dialog.tsx wrapper, which is
 * capped at sm:max-w-sm) so it gets focus-trap/Escape/scroll-lock "for
 * free" while filling the viewport edge to edge. Shows who's tagged on the
 * current photo (linking to their profile) and lets the user step through
 * the gallery with prev/next without closing the overlay — via the chevron
 * buttons, or by dragging/swiping the image left/right — touch on mobile,
 * mouse/trackpad drag on desktop (useSwipeNavigation, Pointer Events cover
 * both; disabled while tagging mode is on since taps there place tags
 * instead).
 * Delete lives on the grid thumbnail (PhotoGrid), not here — a full-screen
 * viewer isn't the place for a destructive action that's one hover away on
 * the grid itself.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  familyId,
  familySlug,
  canTag = false,
}: {
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  familyId: string;
  familySlug: string;
  /** Contributor+ may place/move/remove point-tags — see photo-tag-layer.tsx. */
  canTag?: boolean;
}) {
  const photo = photos[index];
  const [taggingMode, setTaggingMode] = useState(false);
  const reducedMotion = useReducedMotion();

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  // Disabled while tagging mode is on — taps there place tags
  // (PhotoTagLayer), and swipe tracking would fight that gesture.
  const { dragOffset, isDragging, pointerHandlers } = useSwipeNavigation({
    hasPrev,
    hasNext,
    onPrev: () => onIndexChange(index - 1),
    onNext: () => onIndexChange(index + 1),
    disabled: taggingMode,
  });

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/90 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
          <DialogPrimitive.Title className="sr-only">
            {photo.media.title ?? "Семейное фото"}
          </DialogPrimitive.Title>

          <div className="flex items-center justify-end gap-2 p-3">
            {canTag && (
              <Button
                type="button"
                variant={taggingMode ? "default" : "secondary"}
                size="sm"
                className="rounded-full shadow-sm"
                aria-pressed={taggingMode}
                onClick={() => setTaggingMode((v) => !v)}
              >
                <UserPlusIcon />
                Отметить людей
              </Button>
            )}
            <DialogPrimitive.Close
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-full shadow-sm"
                  aria-label="Закрыть"
                />
              }
            >
              <XIcon />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            <div
              className={cn(
                "relative h-full w-full max-w-4xl touch-pan-y select-none",
                !isDragging &&
                  !reducedMotion &&
                  "transition-transform duration-200 ease-(--ease-transition)",
              )}
              style={
                dragOffset !== 0
                  ? { transform: `translateX(${dragOffset}px)` }
                  : undefined
              }
              {...pointerHandlers}
            >
              <Image
                src={`/api/media/${photo.media.id}?familyId=${familyId}`}
                alt={photo.media.title ?? "Семейное фото"}
                fill
                sizes="100vw"
                className="object-contain"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
                unoptimized
              />
              <PhotoTagLayer
                mediaId={photo.media.id}
                people={photo.people}
                taggingMode={taggingMode}
                canTag={canTag}
                familyId={familyId}
                familySlug={familySlug}
              />
            </div>

            {hasPrev && (
              <LightboxNavButton
                direction="prev"
                onClick={() => onIndexChange(index - 1)}
              />
            )}
            {hasNext && (
              <LightboxNavButton
                direction="next"
                onClick={() => onIndexChange(index + 1)}
              />
            )}
          </div>

          {photo.people.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
              {photo.people.map((person) => (
                <Link
                  key={person.id}
                  href={`/families/${familySlug}/people/${person.slug}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                >
                  {personDisplayName(person)}
                </Link>
              ))}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LightboxNavButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Предыдущее фото" : "Следующее фото"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60",
        direction === "prev" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
