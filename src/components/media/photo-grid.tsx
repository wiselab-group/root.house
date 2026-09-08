"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoLightbox } from "./photo-lightbox";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { DeleteMediaButton } from "@/components/forms/delete-media-button";
import type { GalleryPhotoView } from "./gallery-photo";

export type { GalleryPhotoView };

/**
 * The family-wide gallery grid (/families/[slug]/photos) — same visual
 * chrome as PersonMediaGallery's grid (aspect-square, object-cover, same
 * blur placeholder). Clicking the photo itself opens PhotoLightbox; delete
 * lives on the thumbnail (top-right, hover-revealed) rather than inside the
 * lightbox, so it's reachable without an extra step through the full-screen
 * viewer. The delete button is a sibling of the photo's own <button>, not
 * nested inside it — a <button> inside a <button> is invalid HTML and would
 * make a delete click also fire the lightbox-opening click.
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
          <div
            key={photo.media.id}
            className="group relative aspect-square overflow-hidden rounded-md border border-border"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="absolute inset-0 text-left"
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

            {canEdit && (
              <div
                className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <DeleteMediaButton
                  familyId={familyId}
                  familySlug={familySlug}
                  mediaId={photo.media.id}
                />
              </div>
            )}
          </div>
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
        />
      )}
    </>
  );
}
