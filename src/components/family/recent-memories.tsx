"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";
import { PhotoLightbox } from "@/components/media/photo-lightbox";
import type { GalleryPhoto } from "@/domain/media/media.service";

/**
 * "Latest memories" preview on Family Home — a small photo grid linking
 * through to the full Archive. Clicking a photo opens PhotoLightbox over
 * this same list (the family's most recent photos overall, regardless of
 * album membership — see families/[slug]/page.tsx) rather than navigating
 * to /photos, whose feed is deliberately scoped to photos NOT in any album
 * (see that page's own doc comment) and so would silently drop the clicked
 * photo if it belonged to one.
 */
export function RecentMemories({
  photos,
  familyId,
  familySlug,
  canTag,
}: {
  photos: GalleryPhoto[];
  familyId: string;
  familySlug: string;
  canTag: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-medium">Последние фото</h2>
        <Link
          href={`/families/${familySlug}/photos`}
          className="group flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Весь архив
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {photos.map((photo, i) => (
          <button
            key={photo.media.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-md border border-border transition-opacity hover:opacity-90"
          >
            <Image
              src={`/api/media/${photo.media.id}?familyId=${familyId}`}
              alt={photo.media.title ?? "Семейное фото"}
              fill
              sizes="(max-width: 640px) 33vw, 16vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
              unoptimized
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          familyId={familyId}
          familySlug={familySlug}
          canTag={canTag}
        />
      )}
    </section>
  );
}
