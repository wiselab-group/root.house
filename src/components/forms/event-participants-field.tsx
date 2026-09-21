"use client";

import { personDisplayName } from "@/domain/person/display-name";
import { EVENT_ROLES } from "@/domain/event/event-roles";
import type { EventType } from "@/domain/event/event.repository";
import { EventParticipantSearch } from "./event-participant-search";
import { EventParticipantRow } from "./event-participant-row";

export interface EventParticipantValue {
  personId: string;
  name: string;
  role: string;
}

/**
 * Participant editor for EditEventForm — search-as-you-type add (see
 * EventParticipantSearch) but each selected person renders as a row with an
 * editable role <select> instead of a plain removable chip (EventParticipantRow),
 * since role (not just membership) must be editable per person. Role options
 * come from EVENT_ROLES[eventType] — switching the event's type elsewhere in
 * the form re-renders this with new role choices; a role no longer valid for
 * the new type simply falls back to the first option (not auto-fixed
 * silently, to avoid a surprising background change — the select just shows
 * its first option since the stale role value has no matching <option>).
 */
export function EventParticipantsField({
  familyId,
  eventType,
  value,
  onChange,
}: {
  familyId: string;
  eventType: EventType;
  value: EventParticipantValue[];
  onChange: (value: EventParticipantValue[]) => void;
}) {
  const roleOptions = EVENT_ROLES[eventType];

  function removePerson(personId: string) {
    onChange(value.filter((v) => v.personId !== personId));
  }

  function setRole(personId: string, role: string) {
    onChange(value.map((v) => (v.personId === personId ? { ...v, role } : v)));
  }

  return (
    <div className="flex flex-col gap-2">
      <EventParticipantSearch
        familyId={familyId}
        excludeIds={value.map((v) => v.personId)}
        onPick={(person) =>
          onChange([
            ...value,
            {
              personId: person.id,
              name: personDisplayName(person),
              role: roleOptions[0],
            },
          ])
        }
      />

      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((participant) => (
            <EventParticipantRow
              key={participant.personId}
              participant={participant}
              roleOptions={roleOptions}
              onRoleChange={(role) => setRole(participant.personId, role)}
              onRemove={() => removePerson(participant.personId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
