"use client";

import { glassIconButton } from "@/components/hero/glass";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoActionsMenu } from "./photo-actions-menu";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * PhotoGrid's lightbox: an editor gets PhotoActionsMenu in the top bar —
 * the same «⋯» as on a desktop tile, and the only one on a touch screen
 * (user request 2026-10-01). Split out of PhotoGrid for the 150-line
 * ceiling.
 */
export function PhotoGridLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  familyId,
  familySlug,
  canEdit,
  albumId,
  portrait,
  onDeleted,
}: {
  photos: GalleryPhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  albumId?: string | null;
  portrait?: { personId: string; mediaId: string | null };
  /** Runs inside the delete's transition — see PhotoActionsMenu. */
  onDeleted: (mediaId: string) => void;
}) {
  return (
    <PhotoLightbox
      photos={photos}
      index={index}
      onIndexChange={onIndexChange}
      onClose={onClose}
      familyId={familyId}
      familySlug={familySlug}
      canTag={canEdit}
      renderActions={
        canEdit
          ? (photo) => (
              <PhotoActionsMenu
                key={photo.media.id}
                familyId={familyId}
                familySlug={familySlug}
                mediaId={photo.media.id}
                albumId={albumId}
                portrait={
                  portrait && {
                    personId: portrait.personId,
                    isCurrent: portrait.mediaId === photo.media.id,
                  }
                }
                onDeleted={() => onDeleted(photo.media.id)}
                trigger={<button type="button" className={glassIconButton} />}
              />
            )
          : undefined
      }
    />
  );
}
