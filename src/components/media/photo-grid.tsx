"use client";

import { useOptimistic, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoGridTile } from "./photo-grid-tile";
import { usePhotoGridReorder } from "./use-photo-grid-reorder";
import { PhotoArrangeBar } from "./photo-arrange-controls";
import type { GalleryPhotoView } from "./gallery-photo";

export type { GalleryPhotoView };

/**
 * The family-wide gallery grid (/families/[slug]/photos) — same visual
 * chrome as PersonMediaGallery's grid (aspect-square, object-cover, same
 * placeholder). Clicking the photo itself opens PhotoLightbox; delete
 * lives in the thumbnail's «⋯» menu (top-right, «Упорядочить» mode only)
 * rather than inside the lightbox. The menu is a sibling of the photo's
 * own <button>, not nested inside it — a <button> inside a <button> is invalid HTML and would
 * make a delete click also fire the lightbox-opening click.
 *
 * Deletion is optimistic: PhotoTileMenu calls onDelete inside its own
 * startTransition (wrapping both the optimistic update and the actual
 * server action, as React 19 requires), so the tile disappears immediately
 * on confirm instead of waiting for deleteMediaAction's revalidatePath
 * round-trip. If the action throws, the transition rolls back and the tile
 * reappears — no separate error-recovery path needed.
 *
 * Reordering (canEdit only — same floor as this page's other edit actions,
 * see photos/page.tsx) is drag-and-drop via dnd-kit, but only inside the
 * explicit «Упорядочить» mode (button in the section heading — see
 * PhotoArrangeProvider, which callers wrap the section in), which also reveals
 * each tile's «⋯» menu (portrait, album cover, delete) — outside it a tile
 * is just a photo: tap opens it, a swipe scrolls the page. Mode, draft and persistence live in usePhotoGridReorder (split out
 * for CLAUDE.md's 150-line ceiling). sortOrder is a single global value on
 * Media itself (see db/schema/media.ts), so a reorder here is visible in
 * every other gallery containing the same photos too.
 *
 * DndContext's `id` prop is set explicitly (not left to dnd-kit's default
 * auto-increment) — without it, the instance id baked into each tile's
 * aria-describedby can come out different between the server-rendered HTML
 * and the client's hydration pass on a page that also mounts other client
 * components (breadcrumbs, dialogs, ...) consuming id-sequence slots in a
 * different order, causing an intermittent hydration-mismatch warning that
 * a fixed string avoids entirely.
 */
export function PhotoGrid({
  photos,
  familyId,
  familySlug,
  canEdit,
  albumId,
  portrait,
}: {
  photos: GalleryPhotoView[];
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  /** Present only on an album's own page — enables "make cover" on each tile's menu. */
  albumId?: string | null;
  /** Present only in a Person's profile gallery — enables «Сделать портретом»
   *  on each tile and marks the current portrait. */
  portrait?: { personId: string; mediaId: string | null };
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reorder = usePhotoGridReorder(photos, familyId);
  const { order, isArranging } = reorder;
  const [optimisticPhotos, removeOptimisticPhoto] = useOptimistic(
    order,
    (state, deletedMediaId: string) =>
      state.filter((photo) => photo.media.id !== deletedMediaId),
  );

  return (
    <>
      <DndContext
        id="photo-grid-dnd"
        sensors={reorder.sensors}
        collisionDetection={closestCenter}
        onDragStart={reorder.handleDragStart}
        onDragCancel={reorder.handleDragCancel}
        onDragEnd={reorder.handleDragEnd}
      >
        <SortableContext
          items={optimisticPhotos.map((p) => p.media.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {optimisticPhotos.map((photo, i) => (
              <PhotoGridTile
                key={photo.media.id}
                photo={photo}
                familyId={familyId}
                familySlug={familySlug}
                canEdit={canEdit}
                isArranging={isArranging}
                albumId={albumId}
                portraitPersonId={portrait?.personId}
                isPortrait={portrait?.mediaId === photo.media.id}
                onOpen={() => setOpenIndex(i)}
                onDeleted={() => removeOptimisticPhoto(photo.media.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isArranging && (
        <PhotoArrangeBar onCancel={reorder.cancel} onSave={reorder.save} />
      )}

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
