"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteStoryAction } from "@/actions/story.actions";
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

export function DeleteStoryButton({
  familyId,
  personId,
  storyId,
  onDeleted,
}: {
  familyId: string;
  personId: string;
  storyId: string;
  /** Called inside the same transition as the delete action, before it resolves — lets the caller remove the story from its optimistic list immediately instead of waiting for deleteStoryAction's revalidatePath. */
  onDeleted: () => void;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      onDeleted();
      setOpen(false);
      await deleteStoryAction(familyId, personId, storyId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        {tc("delete")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>{tc("cannotUndo")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? tc("deleting") : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
