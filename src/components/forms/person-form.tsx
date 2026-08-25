"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonNameFields } from "./person-name-fields";
import { PersonDateFields } from "./person-date-fields";
import { PersonGenderLivingFields } from "./person-gender-living-fields";
import { PlaceSelect } from "./place-select";
import type { PersonFormState } from "@/actions/person.actions";
import type { PersonRecord } from "@/domain/person/person.service";
import type { PlaceRecord } from "@/domain/place/place.service";

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
}: {
  action: (
    state: PersonFormState,
    formData: FormData,
  ) => Promise<PersonFormState>;
  person?: PersonRecord | null;
  places?: PlaceRecord[];
  submitLabel: string;
  submitPendingLabel: string;
}) {
  const [state, formAction] = useActionState(action, {} as PersonFormState);

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
        date={person?.birthDate}
      />
      <PlaceSelect
        id="birthPlaceId"
        name="birthPlaceId"
        label="Место рождения"
        places={places}
        defaultValue={person?.birthPlaceId}
      />
      {/* Hidden (not just visually — unmounted) while isLiving is checked: a
          death date has no meaning for someone marked alive, and keeping the
          fields out of the form entirely means submitting can't accidentally
          carry over a stale deathYear value from before the checkbox changed. */}
      {!isLiving && (
        <>
          <PersonDateFields
            prefix="death"
            legend="Дата смерти"
            date={person?.deathDate}
          />
          <PlaceSelect
            id="deathPlaceId"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="religion">Религия</Label>
          <Input
            id="religion"
            name="religion"
            defaultValue={person?.religion ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nationality">Национальность</Label>
          <Input
            id="nationality"
            name="nationality"
            defaultValue={person?.nationality ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Описание</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={person?.description ?? ""}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, message]) => (
          <p key={field} className="text-sm text-destructive">
            {message}
          </p>
        ))}

      <SubmitButton label={submitLabel} pendingLabel={submitPendingLabel} />
    </form>
  );
}
