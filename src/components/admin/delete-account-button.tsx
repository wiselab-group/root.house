"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteAccountAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 * Irreversible, so the confirm button stays disabled until the admin types
 * the account's email — the server re-checks it (deleteAccountAction).
 * The dialog spells out what goes with the account, from the same rule
 * deleteUserAccount applies.
 */
export function DeleteAccountButton({
  userId,
  email,
  familiesToDelete,
  sharedFamiliesToDelete,
}: {
  userId: string;
  email: string;
  familiesToDelete: number;
  sharedFamiliesToDelete: number;
}) {
  const t = useTranslations("admin.delete");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTyped("");
      setError(null);
    }
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAccountAction(userId, typed);
      if (result.ok) {
        handleOpenChange(false);
        toast.success(t("done", { email }));
      } else {
        setError(t(`errors.${result.error}`));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("trigger", { email })}
            title={t("trigger", { email })}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body", { email })}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          {familiesToDelete > 0 && (
            <p>{t("families", { count: familiesToDelete })}</p>
          )}
          {sharedFamiliesToDelete > 0 && (
            <p className="text-destructive">
              {t("shared", { count: sharedFamiliesToDelete })}
            </p>
          )}
          <p>{t("kept")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`confirm-${userId}`}>{t("confirmLabel")}</Label>
          <Input
            id={`confirm-${userId}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={email}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!matches || isPending}
            aria-busy={isPending}
          >
            {isPending ? t("deleting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
