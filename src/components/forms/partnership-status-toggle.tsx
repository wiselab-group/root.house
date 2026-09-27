"use client";

import { useTranslations } from "next-intl";
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
  onToggled,
}: {
  familyId: string;
  personId: string;
  otherPersonId: string;
  relationshipId: string;
  isCurrent: boolean;
  relativeName: string;
  /** Called inside the same transition as the status action, before it resolves — lets RelativeGroup flip the pill's isCurrent immediately instead of waiting for setPartnershipStatusAction's revalidatePath. */
  onToggled: (isCurrent: boolean) => void;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("relationships");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      onToggled(!isCurrent);
      setOpen(false);
      await setPartnershipStatusAction(
        familyId,
        personId,
        otherPersonId,
        relationshipId,
        !isCurrent,
      );
    });
  };

  const label = isCurrent
    ? t("markEndedLabel", { name: relativeName })
    : t("markCurrentLabel", { name: relativeName });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className="cursor-pointer rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
          />
        }
      >
        {isCurrent ? <HeartCrackIcon /> : <HeartIcon />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCurrent
              ? t("markEndedTitle", { name: relativeName })
              : t("markCurrentTitle", { name: relativeName })}
          </DialogTitle>
          <DialogDescription>
            {isCurrent ? t("markEndedBody") : t("markCurrentBody")}
          </DialogDescription>
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
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending
              ? t("saving")
              : isCurrent
                ? t("markEnded")
                : t("markCurrent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
