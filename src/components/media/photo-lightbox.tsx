"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassIconButtonLarge } from "@/components/hero/glass";
import {
  LightboxCarouselTrack,
  type LightboxCarouselTrackHandle,
} from "./lightbox-carousel-track";
import type { GalleryPhotoView } from "./gallery-photo";
import { LightboxAmbient } from "./lightbox-ambient";
import { LightboxStrip } from "./lightbox-strip";
import type { StripMode } from "./lightbox-strip-tabs";
import { LightboxTopBar } from "./lightbox-top-bar";
import { PhotoCaption } from "./photo-caption";
import { arrowStep } from "./lightbox-keys";
import { sortLeftToRight } from "./tagged-people-order";
import { useWideLightbox } from "./use-wide-lightbox";

/**
 * Full-screen photo viewer for the family gallery — built directly on
 * @base-ui/react/dialog (not the centered ui/dialog.tsx wrapper) so it gets
 * focus-trap/Escape/scroll-lock "for free" while filling the viewport.
 * Redesigned 2026-09-29 (variant C2 of the lightbox mock) to be compact:
 *
 * - top bar: «3 / 24», the caption (desktop), tag / «⋯» (an editor's
 *   photo actions, from `renderActions`) or download / close;
 * - the photo, as large as the window allows — no max width, only side
 *   room for the hover chevrons on desktop;
 * - one bottom strip of fixed height: who's on the photo, or (desktop) the
 *   whole gallery as a filmstrip — see LightboxStrip.
 *
 * The strip's tab survives paging; tagging pins it to people and «Готово»
 * gives the previous tab back (it's only ever overridden, never changed).
 * Paging: chevrons, ←/→, or dragging the photo — the sliding mechanics live
 * in LightboxCarouselTrack.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  familyId,
  familySlug,
  canTag = false,
  renderActions,
}: {
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  familyId: string;
  familySlug: string;
  /** Contributor+ may place/move/remove point-tags — see photo-tag-layer.tsx. */
  canTag?: boolean;
  /** An editor's «⋯» menu for the shown photo (PhotoGrid's
   *  PhotoActionsMenu) — replaces the plain download button. */
  renderActions?: (photo: GalleryPhotoView) => ReactNode;
}) {
  const tc = useTranslations("common");
  const photo = photos[index];
  const wide = useWideLightbox();
  const [taggingMode, setTaggingMode] = useState(false);
  const [stripMode, setStripMode] = useState<StripMode>("people");
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(
    null,
  );
  const trackRef = useRef<LightboxCarouselTrackHandle>(null);
  const people = useMemo(
    () => (photo ? sortLeftToRight(photo.people) : []),
    [photo],
  );
  if (!photo) return null;

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const caption = (placement: "bar" | "below") => (
    <PhotoCaption
      key={photo.media.id}
      mediaId={photo.media.id}
      caption={photo.media.title}
      familyId={familyId}
      familySlug={familySlug}
      canEdit={canTag}
      placement={placement}
    />
  );

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-background duration-base data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="group/lightbox fixed inset-0 z-50 flex flex-col overflow-hidden outline-none duration-base data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onKeyDown={(event) => {
            const step = arrowStep(event);
            if (!step) return;
            if (step === "prev" ? !hasPrev : !hasNext) return;
            event.preventDefault();
            trackRef.current?.triggerStep(step);
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {photo.media.title ?? tc("familyPhoto")}
          </DialogPrimitive.Title>
          <LightboxAmbient mediaId={photo.media.id} familyId={familyId} />

          <LightboxTopBar
            index={index}
            total={photos.length}
            caption={wide ? caption("bar") : null}
            wide={wide}
            canTag={canTag}
            tagging={taggingMode}
            onToggleTagging={() => setTaggingMode((v) => !v)}
            mediaId={photo.media.id}
            familyId={familyId}
            actions={renderActions?.(photo)}
          />

          {/* overflow-hidden here, not only on the Popup: the track is three
              screens wide, and the Popup must never become scrollable. */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
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

          {!wide && (photo.media.title || canTag) && (
            <div className="relative z-10 shrink-0 px-4 pt-3">
              {caption("below")}
            </div>
          )}

          <LightboxStrip
            wide={wide}
            mode={taggingMode ? "people" : stripMode}
            onModeChange={setStripMode}
            tagging={taggingMode}
            canTag={canTag}
            onStartTagging={() => setTaggingMode(true)}
            photos={photos}
            index={index}
            onIndexChange={onIndexChange}
            people={people}
            familyId={familyId}
            familySlug={familySlug}
            highlightedPersonId={highlightedPersonId}
            onHighlight={setHighlightedPersonId}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Desktop only (phones swipe): a wide invisible edge zone whose chevron
 *  shows while the pointer is over the lightbox or the button has focus. */
function LightboxNavButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const t = useTranslations("media");
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? t("prevPhoto") : t("nextPhoto")}
      onClick={onClick}
      className={cn(
        glassIconButtonLarge,
        "absolute top-1/2 hidden -translate-y-1/2 opacity-0 transition-[opacity,background-color,transform] group-hover/lightbox:opacity-100 focus-visible:opacity-100 md:pointer-fine:inline-flex",
        direction === "prev" ? "left-5" : "right-5",
      )}
    >
      <Icon />
    </button>
  );
}
