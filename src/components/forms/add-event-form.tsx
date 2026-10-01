"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createEventAction,
  type EventFormState,
} from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { EventTypeTitleFields } from "./event-type-title-fields";
import { EventDateRangeFields } from "./event-date-range-fields";
import { PlaceField } from "./place-field";
import { PrivacyLevelSelect } from "./privacy-level-select";
import type { EventType } from "@/domain/event/event.repository";
import type { PlaceRecord } from "@/domain/place/place.service";

const initialState: EventFormState = {};

/**
 * Adds an Event to a Person — rendered inside an EditPanel opened from the
 * Линия жизни heading (ProfileSectionWithAdd's `panelTitle`), the same
 * panel/sheet an existing event is edited in, instead of an inline form
 * that pushed the whole section down (user request 2026-10-01).
 * createEventAction answers `saved`, and the panel closes itself.
 */
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
  const tc = useTranslations("common");
  const panel = useEditPanel();
  const boundAction = createEventAction.bind(null, familyId, personId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const [eventType, setEventType] = useState<EventType>("other");
  const [showRange, setShowRange] = useState(false);

  const closeAfterSave = panel?.closeAfterSave;
  useEffect(() => {
    if (state.saved) closeAfterSave?.();
  }, [state, closeAfterSave]);

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      className="flex min-h-full flex-col gap-4"
    >
      <EventTypeTitleFields
        eventType={eventType}
        onEventTypeChange={setEventType}
        defaultTitle=""
      />

      <EventDateRangeFields
        date={null}
        endDate={null}
        showRange={showRange}
        onShowRangeChange={setShowRange}
      />

      <PlaceField name="placeId" label={t("place")} places={places} />
      <PrivacyLevelSelect />

      <div className="flex flex-col gap-1">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          {t("description")}
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          className="field-sizing-content"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, message]) => (
          <p key={field} className="text-sm text-destructive">
            {message}
          </p>
        ))}

      <EditPanelFooter>
        <Button type="button" variant="ghost" onClick={panel?.requestClose}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("adding") : t("add")}
        </Button>
      </EditPanelFooter>
    </form>
  );
}
