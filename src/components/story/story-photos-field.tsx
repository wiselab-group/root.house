"use client";

import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { StoryPhotoChoice } from "@/actions/story.actions";
import { StoryPhotoTile } from "./story-photo-tile";
import { StoryPhotoPicker } from "./story-photo-picker";

/**
 * «Фото истории» in the story editor — the photos of the story page's hero
 * carousel, in order; the first is the cover. Picked from the family
 * archive (or uploaded into it) through StoryPhotoPicker, rearranged by
 * dragging. Saved with the rest of the form as ordered `photoId` fields
 * (updateStoryAction). With none picked the carousel falls back to the
 * portraits of the story's people (build-story-slides.ts).
 */
export function StoryPhotosField({
  familyId,
  value,
  onChange,
}: {
  familyId: string;
  value: StoryPhotoChoice[];
  onChange: (photos: StoryPhotoChoice[]) => void;
}) {
  const t = useTranslations("storyForm");
  const sensors = useSensors(
    // A small distance, so a tap on the remove button is never a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = value.findIndex((photo) => photo.id === active.id);
    const to = value.findIndex((photo) => photo.id === over.id);
    if (from !== -1 && to !== -1) onChange(arrayMove(value, from, to));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">{t("photos")}</legend>
      <p className="text-sm text-muted-foreground">
        {value.length > 0 ? t("photosHint") : t("photosEmptyHint")}
      </p>

      {value.length > 0 && (
        <DndContext
          // A fixed id keeps dnd-kit's generated aria ids identical between
          // the server render and hydration.
          id="story-photos"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={value.map((photo) => photo.id)}
            strategy={rectSortingStrategy}
          >
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {value.map((photo, index) => (
                <StoryPhotoTile
                  key={photo.id}
                  photo={photo}
                  familyId={familyId}
                  index={index}
                  onRemove={() =>
                    onChange(value.filter((p) => p.id !== photo.id))
                  }
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {value.map((photo) => (
        <input key={photo.id} type="hidden" name="photoId" value={photo.id} />
      ))}

      <StoryPhotoPicker familyId={familyId} value={value} onChange={onChange} />
    </fieldset>
  );
}
