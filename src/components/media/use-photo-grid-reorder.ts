"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { reorderMediaAction } from "@/actions/media.actions";
import type { GalleryPhotoView } from "./gallery-photo";
import { usePhotoArrange } from "./photo-arrange-context";

/**
 * Owns PhotoGrid's «Упорядочить» mode — split out to keep the component itself
 * under CLAUDE.md's 150-line ceiling. Photos only move inside that explicit
 * mode (an always-on drag made a tap-and-slide reorder a photo by accident,
 * and a reorder is global — sortOrder lives on Media, so it shows in every
 * album and profile holding the photo). Drags rearrange a local draft;
 * «Готово» persists it in one reorderMediaAction, «Отмена» or Esc drops it.
 *
 * `order` mirrors the `photos` prop, re-synced on every new prop (a new
 * upload, a delete, a tag change's revalidatePath) — a plain
 * useState(photos) would go stale after such a server round-trip.
 * Re-syncing during render rather than in an effect follows React's "you
 * might not need an effect" guidance for adjusting state on a prop change.
 */
export function usePhotoGridReorder(
  photos: GalleryPhotoView[],
  familyId: string,
) {
  const pathname = usePathname();
  // On/off lives in PhotoArrangeProvider (the button sits in the section
  // heading); the draft order lives here, next to the photos.
  const { isArranging, setArranging } = usePhotoArrange();
  const [lastPhotos, setLastPhotos] = useState(photos);
  const [order, setOrder] = useState(photos);
  const [draft, setDraft] = useState<GalleryPhotoView[] | null>(null);
  const [, startTransition] = useTransition();
  // Esc also cancels an in-flight keyboard drag (dnd-kit's own handler) —
  // that press must not throw away the whole draft too.
  const isDraggingRef = useRef(false);
  // Pointer: a few px of travel before a drag starts, so a press on a tile
  // can still focus it. Keyboard: Space to lift, arrows to move.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (photos !== lastPhotos) {
    setLastPhotos(photos);
    // Always the fresh objects, even when the id sequence is unchanged: a
    // tag placed or dragged on a photo changes that photo's data, not the
    // order — keeping the old objects then left the lightbox on stale tags
    // (a new tag didn't appear, a dragged one snapped back to where it was).
    setOrder(photos);
    // The mode's own menu can delete a photo (or a new upload lands)
    // mid-draft: keep the user's arrangement, drop what's gone, append
    // what's new, and take the fresh objects (portrait/album changes).
    if (draft) {
      const byId = new Map(photos.map((p) => [p.media.id, p]));
      const kept = draft.flatMap((p) => byId.get(p.media.id) ?? []);
      const keptIds = new Set(kept.map((p) => p.media.id));
      setDraft([...kept, ...photos.filter((p) => !keptIds.has(p.media.id))]);
    }
  }

  // Entering the mode starts a draft from the current order; leaving it
  // (Готово, Отмена, Esc) drops the draft. Adjusted during render, same as
  // the prop re-sync above.
  if (isArranging && draft === null) setDraft(order);
  if (!isArranging && draft !== null) setDraft(null);

  useEffect(() => {
    if (!isArranging) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDraggingRef.current) {
        setArranging(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isArranging, setArranging]);

  function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false;
    const { active, over } = event;
    if (!draft || !over || active.id === over.id) return;

    const oldIndex = draft.findIndex((p) => p.media.id === active.id);
    const newIndex = draft.findIndex((p) => p.media.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setDraft(arrayMove(draft, oldIndex, newIndex));
  }

  function save() {
    if (!draft) return;
    const previous = order;
    const next = draft;
    setArranging(false);
    const changed = next.some((p, i) => p.media.id !== previous[i]?.media.id);
    if (!changed) return;

    setOrder(next);
    startTransition(async () => {
      try {
        await reorderMediaAction(
          familyId,
          next.map((p) => p.media.id),
          pathname,
        );
      } catch {
        setOrder(previous);
        toast.error("Не удалось сохранить порядок фото");
      }
    });
  }

  return {
    order: (isArranging && draft) || order,
    isArranging,
    sensors,
    cancel: () => setArranging(false),
    save,
    handleDragStart: () => {
      isDraggingRef.current = true;
    },
    handleDragCancel: () => {
      isDraggingRef.current = false;
    },
    handleDragEnd,
  };
}
