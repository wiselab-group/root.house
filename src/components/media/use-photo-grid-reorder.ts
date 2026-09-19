"use client";

import { useState, useTransition } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { usePathname } from "next/navigation";
import { reorderMediaAction } from "@/actions/media.actions";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * Owns PhotoGrid's local drag-reorder state — split out to keep the
 * component itself under CLAUDE.md's 150-line ceiling. `order` mirrors the
 * `photos` prop but only re-syncs from it when the actual id sequence
 * differs (a new upload, a delete's revalidatePath) — a plain
 * useState(photos) would go stale after such a server round-trip since a
 * prop re-render doesn't reset existing state on its own. Re-syncing during
 * render (comparing against the last-seen `photos` reference) rather than
 * in an effect follows React's "you might not need an effect" guidance for
 * adjusting state when a prop changes — no cascading extra render. A drag
 * reorders `order` locally first (no async boundary to roll back across —
 * the drop IS the final local state), then reorderMediaAction persists it
 * in the background.
 */
export function usePhotoGridReorder(
  photos: GalleryPhotoView[],
  familyId: string,
) {
  const pathname = usePathname();
  const [lastPhotos, setLastPhotos] = useState(photos);
  const [order, setOrder] = useState(photos);
  const [, startTransition] = useTransition();

  if (photos !== lastPhotos) {
    const sameIds =
      order.length === photos.length &&
      order.every((p, i) => p.media.id === photos[i]?.media.id);
    setLastPhotos(photos);
    if (!sameIds) setOrder(photos);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.findIndex((p) => p.media.id === active.id);
    const newIndex = order.findIndex((p) => p.media.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(order, oldIndex, newIndex);
    setOrder(reordered);
    startTransition(async () => {
      await reorderMediaAction(
        familyId,
        reordered.map((p) => p.media.id),
        pathname,
      );
    });
  }

  return { order, handleDragEnd };
}
