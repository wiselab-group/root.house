"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  updatePartnershipDateAction,
  type UpdatePartnershipDateFormState,
} from "@/actions/relationship.actions";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonDateFields } from "./person-date-fields";
import type { PartialDate } from "@/domain/shared/partial-date";

const initialState: UpdatePartnershipDateFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * Dialog body for PartnershipDateEditButton — split into its own file to
 * keep both components under the project's 150-line guideline.
 * `onOpenChange` (used to close on success, see the submittedRef-gated
 * useEffect) is an opaque callback prop rather than the parent's own
 * useState setter passed straight into the effect — same shape as
 * AlbumTitleEditor's DialogContent split, which the set-state-in-effect
 * lint rule accepts (calling a prop callback isn't flagged the way calling
 * a local setState setter directly is).
 */
export function PartnershipDateDialogContent({
  familyId,
  personId,
  otherPersonId,
  relationshipId,
  startDate,
  label,
  onOpenChange,
}: {
  familyId: string;
  personId: string;
  otherPersonId: string;
  relationshipId: string;
  startDate?: PartialDate | null;
  label: string;
  onOpenChange: (open: boolean) => void;
}) {
  const boundAction = updatePartnershipDateAction.bind(
    null,
    familyId,
    personId,
    otherPersonId,
    relationshipId,
  );
  const [state, formAction] = useActionState(boundAction, initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{label}</DialogTitle>
        <DialogDescription>
          Необязательно — оставьте пустым, если дата неизвестна. Если
          указываете месяц или день, год обязателен.
        </DialogDescription>
      </DialogHeader>
      <form
        action={(formData) => {
          submittedRef.current = true;
          formAction(formData);
        }}
        className="flex flex-col gap-3"
      >
        {/* Keyed on the initial date snapshot — PersonDateFields' Input
            uses uncontrolled defaultValue, and this dialog's content stays
            mounted while the Dialog animates closed. Without a key, the
            server round-trip after a successful save (revalidatePath) flows
            a changed `startDate` prop into the SAME Input instance, which
            Base UI's FieldControl warns about ("changing the default value
            state of an uncontrolled FieldControl after being initialized").
            The key forces a fresh mount instead of a prop update whenever
            the saved date actually changes. */}
        <PersonDateFields
          key={JSON.stringify(startDate ?? null)}
          prefix="startDate"
          legend="Дата"
          date={startDate}
        />
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <SubmitButton />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
