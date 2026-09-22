"use client";

import { useState, useTransition } from "react";
import { deleteStoryFromStoriesPageAction } from "@/actions/story.actions";
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

/**
 * Delete button for the story's own detail page — mirrors DeleteEventButton's
 * confirm-dialog shape, but calls deleteStoryFromStoriesPageAction (which
 * redirects to /stories on success) rather than DeleteStoryButton's
 * onDeleted+optimistic-removal shape, since there's no in-place list to
 * remove this row from here — the whole page goes away.
 */
export function DeleteStoryDetailButton({
  familyId,
  storyId,
  storyTitle,
  className,
}: {
  familyId: string;
  storyId: string;
  storyTitle: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteStoryFromStoriesPageAction(familyId, storyId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" className={className} />
        }
      >
        Удалить
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить «{storyTitle}»?</DialogTitle>
          <DialogDescription>Это действие нельзя отменить.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? "Удаляем…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
