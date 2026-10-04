"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ImagePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  listStoryPhotoChoicesAction,
  type StoryPhotoChoice,
} from "@/actions/story.actions";
import { StoryPhotoChoiceGrid } from "./story-photo-choice-grid";
import { StoryPhotoUploadButton } from "./story-photo-upload-button";

/**
 * «Выбрать фото» for StoryPhotosField — the family archive in a Dialog,
 * loaded when it opens. Ticking photos edits a local selection; «Готово»
 * hands it back: photos already in the story keep their order, newly
 * ticked ones join at the end in the order they were ticked. A photo
 * uploaded here goes into the family archive (untagged) and comes ticked.
 */
export function StoryPhotoPicker({
  familyId,
  value,
  onChange,
}: {
  familyId: string;
  value: StoryPhotoChoice[];
  onChange: (photos: StoryPhotoChoice[]) => void;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<StoryPhotoChoice[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setSelected(value.map((photo) => photo.id));
    setLoadFailed(false);
    listStoryPhotoChoicesAction(familyId)
      .then(setChoices)
      .catch(() => setLoadFailed(true));
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleUploaded(photo: StoryPhotoChoice) {
    setChoices((current) => [photo, ...(current ?? [])]);
    setSelected((current) => [...current, photo.id]);
  }

  function handleDone() {
    const known = new Map(
      [...value, ...(choices ?? [])].map((photo) => [photo.id, photo]),
    );
    onChange(
      selected
        .map((id) => known.get(id))
        .filter((photo) => photo !== undefined),
    );
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="self-start">
            <ImagePlusIcon data-icon="inline-start" />
            {value.length > 0 ? t("changePhotos") : t("choosePhotos")}
          </Button>
        }
      />
      <DialogContent className="flex max-h-[min(90svh,48rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("pickerTitle")}</DialogTitle>
          <DialogDescription>{t("pickerHint")}</DialogDescription>
        </DialogHeader>
        <div className="scroll-fade -mx-4 min-h-0 flex-1 overflow-y-auto px-4">
          <StoryPhotoChoiceGrid
            familyId={familyId}
            choices={choices}
            selected={selected}
            loadFailed={loadFailed}
            onToggle={toggle}
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <StoryPhotoUploadButton
            familyId={familyId}
            onUploaded={handleUploaded}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="button" onClick={handleDone}>
              {selected.length > 0
                ? t("pickerDone", { count: selected.length })
                : tc("done")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
