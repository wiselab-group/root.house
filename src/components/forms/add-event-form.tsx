"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  createEventAction,
  type EventFormState,
} from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PersonDateFields } from "./person-date-fields";
import { PlaceField } from "./place-field";
import { PrivacyLevelSelect } from "./privacy-level-select";
import { MANUAL_EVENT_TYPES } from "@/domain/event/event-roles";
import type { PlaceRecord } from "@/domain/place/place.service";
import { useCollapsibleFormClose } from "./collapsible-form";

const initialState: EventFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("eventForm");
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? t("adding") : t("add")}
    </Button>
  );
}

export function AddEventForm({
  familyId,
  personId,
  places = [],
}: {
  familyId: string;
  personId: string;
  places?: PlaceRecord[];
}) {
  const t = useTranslations("eventForm");
  const tTypes = useTranslations("eventTypes");
  const tc = useTranslations("common");
  const close = useCollapsibleFormClose();
  const boundAction = createEventAction.bind(null, familyId, personId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [showRange, setShowRange] = useState(false);
  // Closes the form back to its trigger button on a successful submit —
  // without this, createEventAction's revalidatePath-only success path (no
  // redirect, unlike e.g. updatePersonAction) left the form sitting open
  // with its stale inputs even though the event was already created, easily
  // mistaken for "did that actually work?" (reported by the user). Gated on
  // submittedRef so the effect never fires on initial mount (initialState
  // is also error-free).
  const submittedRef = useRef(false);
  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) close();
  }, [state, close]);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">{t("add")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="type" className="text-xs text-muted-foreground">
            {t("type")}
          </Label>
          <NativeSelect id="type" name="type" defaultValue="other">
            {MANUAL_EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {tTypes(value)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="title" className="text-xs text-muted-foreground">
            {t("title")}
          </Label>
          <Input id="title" name="title" required />
        </div>
      </div>

      <PersonDateFields prefix="date" legend={t("date")} />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox
          checked={showRange}
          onCheckedChange={(checked) => setShowRange(checked)}
        />
        {t("hasEnd")}
      </label>
      {showRange && <PersonDateFields prefix="endDate" legend={t("endDate")} />}

      <PlaceField name="placeId" label={t("place")} places={places} />
      <PrivacyLevelSelect />

      <div className="flex flex-col gap-1">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          {t("description")}
        </Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, message]) => (
          <p key={field} className="text-sm text-destructive">
            {message}
          </p>
        ))}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
