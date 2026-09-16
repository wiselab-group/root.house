"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { personDisplayName } from "@/domain/person/display-name";
import {
  LightboxCarouselTrack,
  type LightboxCarouselTrackHandle,
} from "./lightbox-carousel-track";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * Full-screen photo viewer for the family gallery — built directly on
 * @base-ui/react/dialog (not the centered ui/dialog.tsx wrapper, which is
 * capped at sm:max-w-sm) so it gets focus-trap/Escape/scroll-lock "for
 * free" while filling the viewport edge to edge. Shows who's tagged on the
 * current photo (linking to their profile) and lets the user step through
 * the gallery with prev/next without closing the overlay — via the chevron
 * buttons, or by dragging/swiping the image left/right — touch on mobile,
 * mouse/trackpad drag on desktop. The actual sliding-track mechanics live
 * in LightboxCarouselTrack (see its module doc for why it's a real
 * carousel track and not a single `<img src>` swap).
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
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(
    null,
  );
  const trackRef = useRef<LightboxCarouselTrackHandle>(null);
  if (!photo) return null;

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

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
                {taggingMode ? <CheckIcon /> : <UserPlusIcon />}
                {taggingMode ? "Готово" : "Отметить людей"}
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

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
            <LightboxCarouselTrack
              ref={trackRef}
              photos={photos}
              index={index}
              onIndexChange={onIndexChange}
              familyId={familyId}
              familySlug={familySlug}
              taggingMode={taggingMode}
              canTag={canTag}
              highlightedPersonId={highlightedPersonId}
            />

            {hasPrev && (
              <LightboxNavButton
                direction="prev"
                onClick={() => trackRef.current?.triggerStep("prev")}
              />
            )}
            {hasNext && (
              <LightboxNavButton
                direction="next"
                onClick={() => trackRef.current?.triggerStep("next")}
              />
            )}
          </div>

          <TaggedPeopleStrip
            people={photo.people}
            familySlug={familySlug}
            highlightedPersonId={highlightedPersonId}
            onHighlight={setHighlightedPersonId}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function TaggedPeopleStrip({
  people,
  familySlug,
  highlightedPersonId,
  onHighlight,
}: {
  people: GalleryPhotoView["people"];
  familySlug: string;
  highlightedPersonId: string | null;
  onHighlight: (personId: string | null) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
      {people.map((person) => (
        <Link
          key={person.id}
          href={`/families/${familySlug}/people/${person.slug}`}
          onMouseEnter={() => onHighlight(person.id)}
          onMouseLeave={() => onHighlight(null)}
          onFocus={() => onHighlight(person.id)}
          onBlur={() => onHighlight(null)}
          className={cn(
            "rounded-full px-3 py-1 text-sm text-white transition-colors",
            highlightedPersonId === person.id
              ? "bg-white/25"
              : "bg-white/10 hover:bg-white/20",
          )}
        >
          {personDisplayName(person)}
        </Link>
      ))}
    </div>
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
