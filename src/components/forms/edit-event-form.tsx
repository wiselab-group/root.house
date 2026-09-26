"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateEventAction,
  type EventFormState,
} from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { Textarea } from "@/components/ui/textarea";
import { EventTypeTitleFields } from "./event-type-title-fields";
import { EventDateRangeFields } from "./event-date-range-fields";
import { PlaceField } from "./place-field";
import { PrivacyLevelSelect } from "./privacy-level-select";
import {
  EventParticipantsField,
  type EventParticipantValue,
} from "./event-participants-field";
import type { EventRecord, EventType } from "@/domain/event/event.repository";
import type { PlaceRecord } from "@/domain/place/place.service";

const initialState: EventFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * `cancelHref` (full-page navigation, e.g. the standalone /events/[id]/edit
 * route) and `onCancel`/`onSuccess` (in-place dialog, e.g. TimelineRow's
 * edit dialog opened from a Person's Хронология) are mutually exclusive —
 * exactly one pair is passed depending on where this form is mounted.
 * `redirectTo` is bound straight into updateEventAction: a URL for the
 * page case (same full navigation as before), `null` for the dialog case
 * (stay put, close via onSuccess).
 */
export function EditEventForm({
  familyId,
  event,
  participants,
  places = [],
  cancelHref,
  onCancel,
  onSuccess,
}: {
  familyId: string;
  event: EventRecord;
  participants: EventParticipantValue[];
  places?: PlaceRecord[];
  cancelHref?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const boundAction = updateEventAction.bind(
    null,
    familyId,
    event.id,
    cancelHref ?? null,
  );
  const [state, formAction] = useActionState(boundAction, initialState);
  const [eventType, setEventType] = useState<EventType>(event.type);
  const [showRange, setShowRange] = useState(Boolean(event.endDate));
  const [participantRows, setParticipantRows] = useState(participants);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <EventTypeTitleFields
        eventType={eventType}
        onEventTypeChange={setEventType}
        defaultTitle={event.title}
      />

      <EventDateRangeFields
        date={event.date}
        endDate={event.endDate}
        showRange={showRange}
        onShowRangeChange={setShowRange}
      />

      <PlaceField
        name="placeId"
        label="Место"
        places={places}
        defaultValue={event.placeId}
      />
      <PrivacyLevelSelect defaultValue={event.privacyLevel} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          Описание
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={event.description ?? ""}
        />
      </div>

      <EventParticipantsField
        familyId={familyId}
        eventType={eventType}
        value={participantRows}
        onChange={setParticipantRows}
      />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, message]) => (
          <p key={field} className="text-sm text-destructive">
            {message}
          </p>
        ))}

      <div className="flex items-center gap-3">
        <SubmitButton />
        {cancelHref ? (
          <LinkButton href={cancelHref} variant="ghost">
            Отмена
          </LinkButton>
        ) : (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}
