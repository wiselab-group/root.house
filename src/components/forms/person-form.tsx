"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
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
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { PersonFormActions } from "./person-form-actions";
import { cn } from "@/lib/utils";
import { submitWithoutReset } from "@/lib/submit-without-reset";

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
  /** Where tc("cancel") navigates back to — omitted entirely (no button) when
   *  the caller has no natural "back" page to name. */
  cancelHref?: string;
}) {
  const t = useTranslations("personForm");
  const [state, formAction, pending] = useActionState(
    action,
    {} as PersonFormState,
  );
  useScrollToHash(); // «Редактировать» on a Линия жизни card → #birth/#death
  const panel = useEditPanel();
  const closeAfterSave = panel?.closeAfterSave;
  useEffect(() => {
    if (state.saved) closeAfterSave?.();
  }, [state, closeAfterSave]);

  // Both controlled because they gate which fields render at all: the death
  // fields for the living (a contradiction the server also refuses, see
  // person.service.ts::reconcileLivingStatus), «Девичья фамилия» for men.
  const [isLiving, setIsLiving] = useState(person?.isLiving ?? true);
  const [gender, setGender] = useState(person?.gender ?? "unknown");

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      // min-h-full in the panel lets the pinned action row sit at the
      // bottom even when the form is shorter than the panel.
      className={cn("flex flex-col gap-6", panel && "min-h-full")}
      noValidate
    >
      <PersonNameFields person={person} showMaidenName={gender !== "male"} />

      <PersonGenderLivingFields
        gender={gender}
        onGenderChange={setGender}
        isLiving={isLiving}
        onIsLivingChange={setIsLiving}
      />

      <PersonDateFields
        prefix="birth"
        legend={t("birthDate")}
        anchorId="birth"
        date={person?.birthDate}
      />
      <PlaceField
        name="birthPlaceId"
        label={t("birthPlace")}
        places={places}
        defaultValue={person?.birthPlaceId}
      />
      {/* Unmounted for the deceased, mirroring the death fields below:
          submitting without it clears a stale residence on save. */}
      {isLiving && (
        <PlaceField
          name="residencePlaceId"
          label={t("residence")}
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
            legend={t("deathDate")}
            anchorId="death"
            date={person?.deathDate}
          />
          <PlaceField
            name="deathPlaceId"
            label={t("deathPlace")}
            places={places}
            defaultValue={person?.deathPlaceId}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="deathCause">{t("deathCause")}</Label>
            <Input
              id="deathCause"
              name="deathCause"
              defaultValue={person?.deathCause ?? ""}
              placeholder={t("deathCausePlaceholder")}
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

      <PersonFormActions
        pending={pending}
        submitLabel={submitLabel}
        submitPendingLabel={submitPendingLabel}
        cancelHref={cancelHref}
      />
    </form>
  );
}
