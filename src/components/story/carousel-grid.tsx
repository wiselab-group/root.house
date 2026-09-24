"use client";

import Image from "next/image";
import { XIcon } from "lucide-react";
import { glassPill } from "@/components/hero/glass";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";
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
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Все фото истории"
      aria-hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-background/90 px-4 py-20 backdrop-blur-md transition-opacity duration-300 ease-(--ease-reveal) sm:px-8 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <h2 className="font-heading text-xl font-normal">
        {photoCountLabel(slides.length)}
      </h2>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label={slide.caption ?? `Фото ${index + 1}`}
            onClick={() => onSelect(index)}
            className="aspect-4/3 overflow-hidden rounded-xl transition-transform duration-300 ease-(--ease-reveal) hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Image
              src={slide.src}
              alt=""
              width={320}
              height={240}
              className="size-full object-cover object-[50%_25%]"
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
              unoptimized
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
        Закрыть
      </button>
    </div>
  );
}
