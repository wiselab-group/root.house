"use client";

import { useOptimistic, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoGridTile } from "./photo-grid-tile";
import { usePhotoGridReorder } from "./use-photo-grid-reorder";
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
 *
 * Reordering (canEdit only — same floor as this page's other edit actions,
 * see photos/page.tsx) is drag-and-drop via dnd-kit — state/persistence
 * logic lives in usePhotoGridReorder (split out for CLAUDE.md's 150-line
 * ceiling). sortOrder is a single global value on Media itself (see
 * db/schema/media.ts), so a reorder here is visible in every other gallery
 * containing the same photos too.
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
}: {
  photos: GalleryPhotoView[];
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  /** Present only on an album's own page — enables "make cover" on each tile's menu. */
  albumId?: string | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { order, handleDragEnd } = usePhotoGridReorder(photos, familyId);
  const [optimisticPhotos, removeOptimisticPhoto] = useOptimistic(
    order,
    (state, deletedMediaId: string) =>
      state.filter((photo) => photo.media.id !== deletedMediaId),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  return (
    <>
      <DndContext
        id="photo-grid-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
                canReorder={canEdit}
                albumId={albumId}
                onOpen={() => setOpenIndex(i)}
                onDeleted={() => removeOptimisticPhoto(photo.media.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
