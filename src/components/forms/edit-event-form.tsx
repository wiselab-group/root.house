"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateEventAction,
  type EventFormState,
} from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LinkButton } from "@/components/ui/link-button";
import { Textarea } from "@/components/ui/textarea";
import { PersonDateFields } from "./person-date-fields";
import { PlaceSelect } from "./place-select";
import { PrivacyLevelSelect } from "./privacy-level-select";
import {
  EventParticipantsField,
  type EventParticipantValue,
} from "./event-participants-field";
import { MANUAL_EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
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

export function EditEventForm({
  familyId,
  event,
  participants,
  places = [],
  cancelHref,
}: {
  familyId: string;
  event: EventRecord;
  participants: EventParticipantValue[];
  places?: PlaceRecord[];
  cancelHref: string;
}) {
  const boundAction = updateEventAction.bind(null, familyId, event.id);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [eventType, setEventType] = useState<EventType>(event.type);
  const [showRange, setShowRange] = useState(Boolean(event.endDate));
  const [participantRows, setParticipantRows] = useState(participants);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="type" className="text-xs text-muted-foreground">
            Тип
          </Label>
          <NativeSelect
            id="type"
            name="type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
          >
            {Object.entries(MANUAL_EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="title" className="text-xs text-muted-foreground">
            Название
          </Label>
          <Input id="title" name="title" defaultValue={event.title} required />
        </div>
      </div>

      <PersonDateFields prefix="date" legend="Дата" date={event.date} />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox
          checked={showRange}
          onCheckedChange={(checked) => setShowRange(checked)}
        />
        Есть дата окончания (например, военная служба)
      </label>
      {showRange && (
        <PersonDateFields
          prefix="endDate"
          legend="Дата окончания"
          date={event.endDate}
        />
      )}

      <PlaceSelect
        id="placeId"
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
        <LinkButton href={cancelHref} variant="ghost">
          Отмена
        </LinkButton>
      </div>
    </form>
  );
}
