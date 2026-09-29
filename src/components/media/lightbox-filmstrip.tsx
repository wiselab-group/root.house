"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * The «Все фото» tab of the lightbox's bottom strip (desktop only — phones
 * page with a swipe): every photo of the gallery as a thumbnail, the
 * current one lifted and ringed, a click jumps straight there. Centered
 * while it fits, scrolls sideways once it doesn't, and keeps the current
 * photo in view while paging with the arrows.
 */
export function LightboxFilmstrip({
  photos,
  index,
  onIndexChange,
  familyId,
}: {
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  familyId: string;
}) {
  const t = useTranslations("media");
  const reducedMotion = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  // Scrolls the strip itself, never scrollIntoView: that also scrolls every
  // scrollable ancestor, overflow-hidden ones included — it shifted the
  // whole lightbox sideways, cutting off «3 / 24» (user screenshot,
  // 2026-09-29).
  useEffect(() => {
    const strip = stripRef.current;
    const current = currentRef.current;
    if (!strip || !current) return;
    strip.scrollTo({
      left: current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    // Focus follows the photo: after a thumbnail was clicked it kept focus,
    // and paging with ←/→ left its focus ring on the old one (user
    // screenshot, 2026-09-29). Only when focus is already in the strip.
    if (
      strip.contains(document.activeElement) &&
      document.activeElement !== current
    ) {
      current.focus({ preventScroll: true });
    }
  }, [index, reducedMotion]);

  return (
    <div
      ref={stripRef}
      className="relative mx-auto flex w-fit max-w-full gap-2 overflow-x-auto px-2 py-2.5 scrollbar-none [&::-webkit-scrollbar]:hidden"
    >
      {photos.map((photo, i) => (
        <button
          key={photo.media.id}
          ref={i === index ? currentRef : undefined}
          type="button"
          aria-label={t("photoPosition", {
            index: i + 1,
            total: photos.length,
          })}
          aria-current={i === index ? "true" : undefined}
          onClick={() => onIndexChange(i)}
          className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted opacity-50 ring-offset-2 ring-offset-background transition-[opacity,scale] duration-base ease-(--ease-reveal) outline-none hover:opacity-85 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring aria-current:scale-110 aria-current:opacity-100 aria-current:ring-2 aria-current:ring-foreground aria-current:focus-visible:ring-foreground motion-reduce:transition-none"
        >
          <ArchiveImage
            src={mediaUrl(photo.media.id, familyId, "thumb")}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}
