"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  updatePersonDateAction,
  type UpdatePersonDateFormState,
} from "@/actions/person.actions";
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

const initialState: UpdatePersonDateFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * Dialog body for the synthetic Рождение/Смерть timeline row (see
 * TimelineRow) — same shape as PartnershipDateDialogContent, but writes a
 * single Person date field via the narrow updatePersonDateAction instead of
 * a partnership's startDate.
 */
export function PersonDateDialogContent({
  familyId,
  personId,
  field,
  date,
  label,
  onOpenChange,
}: {
  familyId: string;
  personId: string;
  field: "birthDate" | "deathDate";
  date: PartialDate | null;
  label: string;
  onOpenChange: (open: boolean) => void;
}) {
  const boundAction = updatePersonDateAction.bind(
    null,
    familyId,
    personId,
    field,
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
          Необязательно — оставьте пустым, если дата неизвестна. Если указываете
          месяц или день, год обязателен.
        </DialogDescription>
      </DialogHeader>
      <form
        action={(formData) => {
          submittedRef.current = true;
          formAction(formData);
        }}
        className="flex flex-col gap-3"
      >
        {/* Keyed on the initial date snapshot — see
            PartnershipDateDialogContent's own comment for why: without a
            key, a post-save revalidatePath flows the new `date` prop into
            the same uncontrolled Input instance, which Base UI warns
            about. */}
        <PersonDateFields
          key={JSON.stringify(date)}
          prefix="date"
          legend="Дата"
          date={date}
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
