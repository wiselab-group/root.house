"use client";

import { useState, useTransition } from "react";
import { HeartIcon, HeartCrackIcon } from "lucide-react";
import { setPartnershipStatusAction } from "@/actions/relationship.actions";
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
 * Flips a partnership between current (married/together) and past
 * (divorced) — the write side of relationship-edge.tsx's own dashed-line
 * distinction (a current union draws a coarser "5 3" dash, a past one a
 * finer "2 4" dash, see PartnershipEdgeLine's dashStyle). Same
 * confirm-dialog pattern as RemoveRelationshipButton (a misclick here
 * changes a real fact about the family, not just a display toggle), but its
 * own icon/copy so it isn't mistaken for the unlink action sitting right
 * next to it.
 */
export function PartnershipStatusToggle({
  familyId,
  personId,
  otherPersonId,
  relationshipId,
  isCurrent,
  relativeName,
}: {
  familyId: string;
  personId: string;
  otherPersonId: string;
  relationshipId: string;
  isCurrent: boolean;
  relativeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await setPartnershipStatusAction(
        familyId,
        personId,
        otherPersonId,
        relationshipId,
        !isCurrent,
      );
      setOpen(false);
    });
  };

  const label = isCurrent
    ? `Отметить брак с ${relativeName} как завершённый`
    : `Отметить брак с ${relativeName} как текущий`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            title={label}
            className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground"
          />
        }
      >
        {isCurrent ? <HeartCrackIcon /> : <HeartIcon />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCurrent
              ? `Отметить брак с ${relativeName} как завершённый?`
              : `Отметить брак с ${relativeName} как текущий?`}
          </DialogTitle>
          <DialogDescription>
            {isCurrent
              ? "Связь сохранится — на дереве линия между вами станет пунктиром бывшего брака."
              : "Линия между вами на дереве снова станет пунктиром текущего брака."}
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
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending
              ? "Сохраняем…"
              : isCurrent
                ? "Отметить как бывший"
                : "Отметить как текущий"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
