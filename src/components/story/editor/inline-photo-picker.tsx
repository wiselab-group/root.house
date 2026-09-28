"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listStoryPhotoChoicesAction,
  type StoryPhotoChoice,
} from "@/actions/story.actions";
import { StoryPhotoChoiceGrid } from "../story-photo-choice-grid";
import { StoryPhotoUploadButton } from "../story-photo-upload-button";

/**
 * «Фото» from the editor's «+» menu: the family archive (the same grid as
 * the carousel's StoryPhotoPicker), but one photo, placed into the text the
 * moment it's tapped. A photo uploaded here goes into the archive and into
 * the text. Photos in the text are separate from the hero carousel's.
 */
export function InlinePhotoPicker({
  familyId,
  open,
  onOpenChange,
  onPick,
}: {
  familyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (photoId: string) => void;
}) {
  const t = useTranslations("storyForm");
  const [choices, setChoices] = useState<StoryPhotoChoice[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listStoryPhotoChoicesAction(familyId)
      .then((photos) => {
        if (!cancelled) {
          setChoices(photos);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, familyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90svh,48rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("inlinePickerTitle")}</DialogTitle>
          <DialogDescription>{t("inlinePickerHint")}</DialogDescription>
        </DialogHeader>
        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
          <StoryPhotoChoiceGrid
            familyId={familyId}
            choices={choices}
            selected={[]}
            loadFailed={loadFailed}
            onToggle={onPick}
          />
        </div>
        <DialogFooter className="sm:justify-start">
          <StoryPhotoUploadButton
            familyId={familyId}
            onUploaded={(photo) => onPick(photo.id)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
