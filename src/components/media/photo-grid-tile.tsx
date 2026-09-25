"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { PhotoTileMenu } from "./photo-tile-menu";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * One draggable tile in PhotoGrid — split out so useSortable's per-tile
 * transform/listeners don't clutter the grid component itself. The whole
 * tile is the drag handle (not a separate grip icon) since there's no other
 * gesture competing for a plain press-and-hold on a photo; dnd-kit's default
 * activation constraint already distinguishes a tap (open lightbox) from a
 * drag (reorder) by movement distance, so both can share the same element.
 */
export function PhotoGridTile({
  photo,
  familyId,
  familySlug,
  canEdit,
  canReorder,
  albumId,
  portraitPersonId,
  isPortrait = false,
  onOpen,
  onDeleted,
}: {
  photo: GalleryPhotoView;
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  canReorder: boolean;
  albumId?: string | null;
  /** Set in a Person's profile gallery — see PhotoTileMenu's `portrait`. */
  portraitPersonId?: string;
  isPortrait?: boolean;
  onOpen: () => void;
  onDeleted: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.media.id, disabled: !canReorder });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...(canReorder ? listeners : {})}
      className="group relative aspect-square touch-none overflow-hidden rounded-md border border-border bg-muted"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 text-left"
      >
        <ArchiveImage
          src={mediaUrl(photo.media.id, familyId, "thumb")}
          alt={photo.media.title ?? "Семейное фото"}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
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
            portrait={
              portraitPersonId
                ? { personId: portraitPersonId, isCurrent: isPortrait }
                : undefined
            }
            onDeleted={onDeleted}
          />
        </div>
      )}
    </div>
  );
}
