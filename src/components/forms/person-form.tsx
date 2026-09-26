"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonNameFields } from "./person-name-fields";
import { PersonDateFields } from "./person-date-fields";
import { PersonGenderLivingFields } from "./person-gender-living-fields";
import { PersonMiscFields } from "./person-misc-fields";
import { PlaceField } from "./place-field";
import { PrivacyLevelSelect } from "./privacy-level-select";
import type { PersonFormState } from "@/actions/person.actions";
import type { PersonRecord } from "@/domain/person/person.service";
import type { PlaceRecord } from "@/domain/place/place.service";
import { useScrollToHash } from "@/lib/use-scroll-to-hash";

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function PersonForm({
  action,
  person,
  places = [],
  submitLabel,
  submitPendingLabel,
  cancelHref,
}: {
  action: (
    state: PersonFormState,
    formData: FormData,
  ) => Promise<PersonFormState>;
  person?: PersonRecord | null;
  places?: PlaceRecord[];
  submitLabel: string;
  submitPendingLabel: string;
  /** Where "Отмена" navigates back to — omitted entirely (no button) when
   *  the caller has no natural "back" page to name. */
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, {} as PersonFormState);
  useScrollToHash(); // «Редактировать» on a Линия жизни card → #birth/#death

  // Controlled (not defaultChecked) because it gates whether the death-date
  // fields render at all below — "жив(а)" + a death date is a contradiction
  // the server also refuses to persist (see person.service.ts::reconcileLivingStatus),
  // but hiding the fields client-side means the user never has a chance to
  // create that contradiction in the first place, rather than discovering it
  // was silently overridden after submit.
  const [isLiving, setIsLiving] = useState(person?.isLiving ?? true);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <PersonNameFields person={person} />

      <PersonGenderLivingFields
        gender={person?.gender}
        isLiving={isLiving}
        onIsLivingChange={setIsLiving}
      />

      <PersonDateFields
        prefix="birth"
        legend="Дата рождения"
        anchorId="birth"
        date={person?.birthDate}
      />
      <PlaceField
        name="birthPlaceId"
        label="Место рождения"
        places={places}
        defaultValue={person?.birthPlaceId}
      />
      {/* Unmounted for the deceased, mirroring the death fields below:
          submitting without it clears a stale residence on save. */}
      {isLiving && (
        <PlaceField
          name="residencePlaceId"
          label="Где живёт сейчас"
          places={places}
          defaultValue={person?.residencePlaceId}
        />
      )}
      {/* Hidden (not just visually — unmounted) while isLiving is checked: a
          death date has no meaning for someone marked alive, and keeping the
          fields out of the form entirely means submitting can't accidentally
          carry over a stale deathYear value from before the checkbox changed. */}
      {!isLiving && (
        <>
          <PersonDateFields
            prefix="death"
            legend="Дата смерти"
            anchorId="death"
            date={person?.deathDate}
          />
          <PlaceField
            name="deathPlaceId"
            label="Место смерти"
            places={places}
            defaultValue={person?.deathPlaceId}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="deathCause">Причина смерти</Label>
            <Input
              id="deathCause"
              name="deathCause"
              defaultValue={person?.deathCause ?? ""}
              placeholder="Например, болезнь"
            />
          </div>
        </>
      )}

      <PersonMiscFields person={person} />

      <PrivacyLevelSelect defaultValue={person?.privacyLevel ?? "family"} />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, message]) => (
          <p key={field} className="text-sm text-destructive">
            {message}
          </p>
        ))}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel={submitPendingLabel} />
        {cancelHref && (
          <LinkButton href={cancelHref} variant="ghost">
            Отмена
          </LinkButton>
        )}
      </div>
    </form>
  );
}
