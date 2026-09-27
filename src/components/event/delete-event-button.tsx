"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteEventAction } from "@/actions/event.actions";
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

/** Mirrors DeletePersonButton's confirm-dialog shape exactly — see that
 *  component's own doc comment. */
export function DeleteEventButton({
  familyId,
  personId,
  eventId,
  eventTitle,
  className,
}: {
  familyId: string;
  personId: string;
  eventId: string;
  eventTitle: string;
  className?: string;
}) {
  const t = useTranslations("event");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteEventAction(familyId, personId, eventId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" className={className} />
        }
      >
        {tc("delete")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle", { title: eventTitle })}</DialogTitle>
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
