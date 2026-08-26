"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteFamilyAction,
  type DeleteFamilyFormState,
} from "@/actions/family.actions";
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

const initialState: DeleteFamilyFormState = {};

function ConfirmDeleteButton({ matchesName }: { matchesName: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending || !matchesName}
      aria-busy={pending}
    >
      {pending ? "Удаляем…" : "Удалить архив навсегда"}
    </Button>
  );
}

/** Irreversible — retyping the family's exact name is required before the
 *  submit button even enables, on top of the action's own server-side check
 *  (see deleteFamilyAction), so a misclick can't nuke a whole archive. */
function DeleteFamilyDialogContent({
  familyId,
  familyName,
  onCancel,
}: {
  familyId: string;
  familyName: string;
  onCancel: () => void;
}) {
  const boundAction = deleteFamilyAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [confirmValue, setConfirmValue] = useState("");
  const matchesName = confirmValue.trim() === familyName;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Удалить архив «{familyName}»?</DialogTitle>
        <DialogDescription>
          Будут безвозвратно удалены все люди, связи, события, медиа и истории
          этой семьи. Отменить это действие нельзя.
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="confirm-family-name"
            className="text-xs text-muted-foreground"
          >
            Чтобы подтвердить, введите название семьи:{" "}
            <strong>{familyName}</strong>
          </Label>
          <Input
            id="confirm-family-name"
            name="confirmName"
            autoComplete="off"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            required
          />
          {state.fieldErrors?.confirmName && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.confirmName}
            </p>
          )}
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <ConfirmDeleteButton matchesName={matchesName} />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Danger-zone row — only ever rendered for an owner (see
 *  FamilySettingsDeleteRow); deletion itself is re-checked server-side in
 *  deleteFamilyAction regardless. */
export function FamilyDeleteSettings({
  familyId,
  familyName,
}: {
  familyId: string;
  familyName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Удалить архив семьи</span>
        <p className="text-sm text-muted-foreground">
          Безвозвратно удаляет семью и все данные в ней — людей, связи, события,
          медиа и истории.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" variant="destructive" />}>
          Удалить архив
        </DialogTrigger>
        <DeleteFamilyDialogContent
          familyId={familyId}
          familyName={familyName}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </div>
  );
}
