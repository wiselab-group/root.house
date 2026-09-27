"use client";

import { useTranslations } from "next-intl";
import { ArchiveImage } from "@/components/media/archive-image";
import { XIcon } from "lucide-react";
import { glassPill } from "@/components/hero/glass";
import type { CarouselSlide } from "./story-carousel";

/**
 * "All photos of this story" — a grid laid over the hero itself (not a
 * separate modal page), opened by the carousel's grid button; picking a
 * photo shows it in the hero and closes the grid.
 */
export function CarouselGrid({
  slides,
  open,
  onClose,
  onSelect,
}: {
  slides: CarouselSlide[];
  open: boolean;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const tCount = useTranslations("counts");
  const tStories = useTranslations("stories");
  const tc = useTranslations("common");
  const t = useTranslations("stories");
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("allPhotos")}
      aria-hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-background/90 px-4 py-20 backdrop-blur-md transition-opacity duration-slow ease-(--ease-reveal) sm:px-8 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <h2 className="font-heading text-xl font-normal">
        {tCount("photos", { count: slides.length })}
      </h2>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label={slide.caption ?? tStories("photoN", { n: index + 1 })}
            onClick={() => onSelect(index)}
            className="aspect-4/3 overflow-hidden rounded-xl bg-muted transition-transform duration-slow ease-(--ease-reveal) hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArchiveImage
              src={slide.thumbSrc}
              alt=""
              width={320}
              height={240}
              className="size-full object-cover object-[50%_25%]"
            />
          </button>
        ))}
      </div>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        className={glassPill}
        onClick={onClose}
      >
        <XIcon aria-hidden="true" />
        {tc("close")}
      </button>
    </div>
  );
}
