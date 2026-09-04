"use client";

import { useTransition } from "react";
import { deleteStoryAction } from "@/actions/story.actions";
import { Button } from "@/components/ui/button";

export function DeleteStoryButton({
  familyId,
  personId,
  storyId,
}: {
  familyId: string;
  personId: string;
  storyId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      className="text-muted-foreground hover:text-destructive"
      onClick={() =>
        startTransition(() => deleteStoryAction(familyId, personId, storyId))
      }
    >
      {isPending ? "Удаляем…" : "Удалить"}
    </Button>
  );
}
