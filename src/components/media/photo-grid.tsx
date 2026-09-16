"use client";

import { useOptimistic, useState } from "react";
import Image from "next/image";
import { PhotoLightbox } from "./photo-lightbox";
import { BLUR_PLACEHOLDER } from "./blur-placeholder";
import { PhotoTileMenu } from "./photo-tile-menu";
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
 *
 * Deletion is optimistic: PhotoTileMenu calls onDelete inside its own
 * startTransition (wrapping both the optimistic update and the actual
 * server action, as React 19 requires), so the tile disappears immediately
 * on confirm instead of waiting for deleteMediaAction's revalidatePath
 * round-trip. If the action throws, the transition rolls back and the tile
 * reappears — no separate error-recovery path needed.
 */
export function PhotoGrid({
  photos,
  familyId,
  familySlug,
  canEdit,
  albumId,
}: {
  photos: GalleryPhotoView[];
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  /** Present only on an album's own page — enables "make cover" on each tile's menu. */
  albumId?: string | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [optimisticPhotos, removeOptimisticPhoto] = useOptimistic(
    photos,
    (state, deletedMediaId: string) =>
      state.filter((photo) => photo.media.id !== deletedMediaId),
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {optimisticPhotos.map((photo, i) => (
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
                className="absolute top-2 right-2"
                onClick={(e) => e.stopPropagation()}
              >
                <PhotoTileMenu
                  familyId={familyId}
                  familySlug={familySlug}
                  mediaId={photo.media.id}
                  albumId={albumId}
                  onDeleted={() => removeOptimisticPhoto(photo.media.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <PhotoLightbox
          photos={optimisticPhotos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          familyId={familyId}
          familySlug={familySlug}
          canTag={canEdit}
        />
      )}
    </>
  );
}
