"use client";

import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArchiveImage } from "@/components/media/archive-image";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaUrl } from "@/lib/media-url";
import type { StoryPhotoChoice } from "@/actions/story.actions";

/** StoryPhotoPicker's archive grid: `choices` null while loading. A ticked
 *  photo shows its place in the selection, so the order the carousel will
 *  get is visible while picking. */
export function StoryPhotoChoiceGrid({
  familyId,
  choices,
  selected,
  loadFailed,
  onToggle,
}: {
  familyId: string;
  choices: StoryPhotoChoice[] | null;
  selected: string[];
  loadFailed: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");

  if (loadFailed) {
    return <p className="py-8 text-sm text-destructive">{t("pickerFailed")}</p>;
  }
  if (choices === null) {
    return (
      <div
        aria-busy="true"
        className="grid grid-cols-3 gap-2 py-1 sm:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }
  if (choices.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">{t("pickerEmpty")}</p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-2 py-1 sm:grid-cols-4">
      {choices.map((photo) => {
        const order = selected.indexOf(photo.id);
        const isSelected = order !== -1;
        return (
          <li key={photo.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(photo.id)}
              // The selection ring is drawn inside the tile, over the photo
              // (the span below), not around it: an outer ring was clipped
              // by the dialog's scroll area, and the photo shrunk inside it
              // showed square corners in a round frame (user screenshot
              // 2026-09-29). Photo, frame and ring share one radius.
              className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ArchiveImage
                src={mediaUrl(photo.id, familyId, "thumb")}
                alt={photo.alt ?? tc("familyPhoto")}
                fill
                sizes="(max-width: 640px) 33vw, 160px"
                className="object-cover transition-transform duration-base ease-(--ease-reveal) group-hover:scale-105 group-active:scale-100 motion-reduce:transition-none"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-foreground/10 ring-inset transition-shadow duration-base ease-(--ease-reveal)",
                  isSelected && "ring-3 ring-primary",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-xs font-medium shadow-sm transition-[transform,opacity] duration-base ease-(--ease-reveal)",
                  isSelected
                    ? "scale-100 bg-primary text-primary-foreground"
                    : "scale-90 bg-background/70 text-transparent opacity-0 backdrop-blur-sm group-hover:opacity-100",
                )}
              >
                {isSelected ? order + 1 : <CheckIcon className="size-3.5" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
