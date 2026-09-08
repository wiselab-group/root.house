"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeMemberAction } from "@/actions/family.actions";
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
 * Confirm-dialog remove button for one member row — same Dialog pattern as
 * FamilyDeleteSettings. Owner-only surface; re-checked (and the last-owner
 * guard re-enforced) server-side in removeMemberAction regardless.
 */
export function RemoveMemberButton({
  familyId,
  memberUserId,
  memberLabel,
  disabled,
}: {
  familyId: string;
  memberUserId: string;
  memberLabel: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction(familyId, memberUserId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" disabled={disabled} />
        }
      >
        Удалить
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить участника «{memberLabel}»?</DialogTitle>
          <DialogDescription>
            {memberLabel} потеряет доступ ко всем данным этой семьи немедленно.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            aria-busy={isPending}
            onClick={confirmRemove}
          >
            {isPending ? "Удаляем…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
