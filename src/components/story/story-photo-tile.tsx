"use client";

import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArchiveImage } from "@/components/media/archive-image";
import { mediaUrl } from "@/lib/media-url";
import type { StoryPhotoChoice } from "@/actions/story.actions";

/**
 * One picked photo in StoryPhotosField. The whole tile is the drag handle
 * (mouse, touch, or focus + Space/arrows, dnd-kit's keyboard sensor); the
 * first tile is the story's cover, marked «Обложка». The remove button
 * keeps its own presses out of dnd-kit so tapping it never lifts the tile.
 */
export function StoryPhotoTile({
  photo,
  familyId,
  index,
  onRemove,
}: {
  photo: StoryPhotoChoice;
  familyId: string;
  index: number;
  onRemove: () => void;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });
  const isCover = index === 0;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={t("photoPosition", { position: index + 1 })}
      className={cn(
        "group relative aspect-4/3 cursor-grab touch-none overflow-hidden rounded-md bg-muted ring-1 ring-border transition-shadow duration-base ease-(--ease-reveal) outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
        isDragging && "z-10 shadow-xl ring-2 ring-primary",
      )}
    >
      <ArchiveImage
        src={mediaUrl(photo.id, familyId, "thumb")}
        alt={photo.alt ?? tc("familyPhoto")}
        fill
        sizes="(max-width: 640px) 50vw, 180px"
        className="pointer-events-none object-cover"
      />
      {isCover && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
          {t("coverBadge")}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={t("removePhoto", { position: index + 1 })}
        className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-[transform,opacity] duration-base ease-(--ease-reveal) outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}
