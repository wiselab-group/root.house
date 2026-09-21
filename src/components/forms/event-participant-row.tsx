import { XIcon } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { EVENT_ROLE_LABELS } from "@/domain/event/event-roles";
import type { EventParticipantValue } from "./event-participants-field";

/** One selected-participant row (name + role <select> + remove button) —
 *  split out of EventParticipantsField to keep it under the project's
 *  150-line component guideline, same reasoning as PersonMultiComboboxItem. */
export function EventParticipantRow({
  participant,
  roleOptions,
  onRoleChange,
  onRemove,
}: {
  participant: EventParticipantValue;
  roleOptions: readonly string[];
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-border p-2">
      <span className="flex-1 text-sm font-medium">{participant.name}</span>
      <NativeSelect
        aria-label={`Роль — ${participant.name}`}
        value={participant.role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="w-auto"
      >
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {EVENT_ROLE_LABELS[role] ?? role}
          </option>
        ))}
      </NativeSelect>
      <button
        type="button"
        aria-label={`Убрать ${participant.name}`}
        onClick={onRemove}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
      <input
        type="hidden"
        name="participantPersonId"
        value={participant.personId}
      />
      <input type="hidden" name="participantRole" value={participant.role} />
    </li>
  );
}
