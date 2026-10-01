"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** PhotoActionsMenu's «Удалить фото?» confirmation — split out to keep the
 *  menu under the 150-line component guideline. */
export function DeletePhotoDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("media");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deletePhotoTitle")}</DialogTitle>
          <DialogDescription>{t("deletePhotoBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
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
