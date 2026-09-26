"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import { PhotoTileMenu } from "./photo-tile-menu";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * One tile in PhotoGrid — split out so useSortable's per-tile
 * transform/listeners don't clutter the grid component itself. Two states:
 * normally a plain photo to look at (tap opens the lightbox, no menu, and
 * no touch-none — a swipe over the grid must scroll the page on a phone);
 * in «Упорядочить» mode the whole tile becomes the drag handle, marked with a
 * grip, the photo no longer opens, and the «⋯» menu is always visible.
 */
export function PhotoGridTile({
  photo,
  familyId,
  familySlug,
  canEdit,
  isArranging,
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
  /** «Упорядочить» mode — see usePhotoGridReorder. */
  isArranging: boolean;
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
  } = useSortable({ id: photo.media.id, disabled: !isArranging });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...(isArranging ? { ...attributes, ...listeners } : {})}
      aria-label={isArranging ? "Переместить фото" : undefined}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-md border border-border bg-muted",
        isArranging &&
          "cursor-grab touch-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing",
        isDragging && "z-10 shadow-xl ring-2 ring-primary",
      )}
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={isArranging}
        tabIndex={isArranging ? -1 : undefined}
        className="absolute inset-0 text-left disabled:pointer-events-none"
      >
        <ArchiveImage
          src={mediaUrl(photo.media.id, familyId, "thumb")}
          alt={photo.media.title ?? "Семейное фото"}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className={cn(
            "object-cover transition-transform duration-200",
            !isArranging && "group-hover:scale-105",
          )}
        />
      </button>

      {isArranging && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm"
        >
          <GripVerticalIcon className="size-4" />
        </span>
      )}

      {canEdit && isArranging && (
        // The tile itself is the drag handle — keep the menu's own presses
        // (and Enter/Space, which would lift the tile) out of dnd-kit.
        <div
          className="absolute top-2 right-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
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
