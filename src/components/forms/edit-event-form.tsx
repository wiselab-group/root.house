"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import {
  updateEventAction,
  type EventFormState,
} from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { Textarea } from "@/components/ui/textarea";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";
import { cn } from "@/lib/utils";
import { submitWithoutReset } from "@/lib/submit-without-reset";
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

function SubmitButton({ pending }: { pending: boolean }) {
  const tc = useTranslations("common");
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? tc("saving") : tc("save")}
    </Button>
  );
}

/**
 * Edits an Event in one of two places: inside an EditPanel (over the event
 * page via its intercepted @modal/(.)edit route, or opened in place from a
 * Person's Линия жизни — TimelineRow), or as the standalone /events/[id]/edit
 * page after a hard load. In the panel, updateEventAction is bound with
 * redirectTo = null: it returns `saved` and the panel closes itself; on the
 * standalone page it redirects to `cancelHref` (the event's own page).
 */
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
  cancelHref?: string;
}) {
  const t = useTranslations("eventForm");
  const tc = useTranslations("common");
  const panel = useEditPanel();
  const boundAction = updateEventAction.bind(
    null,
    familyId,
    event.id,
    panel ? null : (cancelHref ?? null),
  );
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const [eventType, setEventType] = useState<EventType>(event.type);
  const [showRange, setShowRange] = useState(Boolean(event.endDate));
  const [participantRows, setParticipantRows] = useState(participants);

  const closeAfterSave = panel?.closeAfterSave;
  useEffect(() => {
    if (state.saved) closeAfterSave?.();
  }, [state, closeAfterSave]);

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      className={cn("flex flex-col gap-4", panel && "min-h-full")}
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
        label={t("place")}
        places={places}
        defaultValue={event.placeId}
      />
      <PrivacyLevelSelect defaultValue={event.privacyLevel} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          {tc("description")}
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event.description ?? ""}
          className="field-sizing-content"
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

      {panel ? (
        <EditPanelFooter>
          <Button type="button" variant="ghost" onClick={panel.requestClose}>
            {tc("cancel")}
          </Button>
          <SubmitButton pending={pending} />
        </EditPanelFooter>
      ) : (
        <div className="flex items-center gap-3">
          <SubmitButton pending={pending} />
          {cancelHref && (
            <LinkButton href={cancelHref} variant="ghost">
              {tc("cancel")}
            </LinkButton>
          )}
        </div>
      )}
    </form>
  );
}
