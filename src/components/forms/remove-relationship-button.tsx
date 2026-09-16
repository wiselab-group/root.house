"use client";

import { useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import {
  removeParentChildAction,
  removePartnershipAction,
} from "@/actions/relationship.actions";
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
 * Unlinks a parent_child or partnership relationship — does NOT delete the
 * other Person, only the relationship row between them. A lighter-weight
 * confirm than DeletePersonButton's (this doesn't cascade to anything else),
 * but still gated behind a dialog since it's easy to misclick a small × icon.
 */
export function RemoveRelationshipButton({
  familyId,
  personId,
  relationshipId,
  relationshipKind,
  relativeName,
  onRemoved,
}: {
  familyId: string;
  personId: string;
  relationshipId: string;
  relationshipKind: "parent_child" | "partnership";
  relativeName: string;
  /** Called inside the same transition as the remove action, before it resolves — lets RelativeGroup drop the pill from its optimistic list immediately instead of waiting for the action's revalidatePath. */
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      onRemoved();
      setOpen(false);
      if (relationshipKind === "parent_child") {
        await removeParentChildAction(familyId, personId, relationshipId);
      } else {
        await removePartnershipAction(familyId, personId, relationshipId);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Убрать связь с ${relativeName}`}
            className="cursor-pointer rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <XIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Убрать связь с {relativeName}?</DialogTitle>
          <DialogDescription>
            Сам человек останется в семье — удаляется только эта связь. Действие
            можно повторить в обратную сторону, добавив связь заново.
          </DialogDescription>
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
            {isPending ? "Убираем…" : "Убрать связь"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
