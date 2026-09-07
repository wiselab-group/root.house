"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoLightbox } from "./photo-lightbox";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import type { GalleryPhotoView } from "./gallery-photo";

export type { GalleryPhotoView };

/**
 * The family-wide gallery grid (/families/[slug]/photos) — same visual
 * chrome as PersonMediaGallery's grid (aspect-square, object-cover, same
 * blur placeholder), but clicking a photo opens PhotoLightbox instead of
 * just showing an inline delete control, since this page has many more
 * photos and no single "whose profile is this" context to fall back on.
 */
export function PhotoGrid({
  photos,
  familyId,
  familySlug,
  canEdit,
}: {
  photos: GalleryPhotoView[];
  familyId: string;
  familySlug: string;
  canEdit: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <button
            key={photo.media.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-md border border-border text-left"
          >
            <Image
              src={`/api/media/${photo.media.id}?familyId=${familyId}`}
              alt={photo.media.title ?? "Семейное фото"}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
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
          canEdit={canEdit}
        />
      )}
    </>
  );
}
