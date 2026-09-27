import { XIcon } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useTranslations } from "next-intl";
import { useEventRoleLabel } from "./use-event-role-label";
import type { EventParticipantValue } from "./event-participants-field";

/** One selected-participant row (name + role <select> + remove button) —
 *  split out of EventParticipantsField to keep it under the project's
 *  150-line component guideline, same reasoning as PersonMultiComboboxItem.
 *  The role <select> only renders when the event type has a real choice
 *  (крещение: крестник/крёстный, свадьба: супруг/свидетель); with a single
 *  role it was a one-option dropdown that did nothing (user question
 *  2026-09-27), so the row is just the name and that role is submitted —
 *  which also replaces a stale role left over from a previous event type. */
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
  const t = useTranslations("eventForm");
  const roleLabel = useEventRoleLabel();
  const hasRoleChoice = roleOptions.length > 1;
  const role = hasRoleChoice ? participant.role : roleOptions[0];
  return (
    <li className="flex items-center gap-2 rounded-md border border-border p-2">
      <span className="flex-1 text-sm font-medium">{participant.name}</span>
      {hasRoleChoice && (
        <NativeSelect
          aria-label={t("roleFor", { name: participant.name })}
          value={participant.role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="w-auto"
          containerClassName="w-auto shrink-0"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {roleLabel(option)}
            </option>
          ))}
        </NativeSelect>
      )}
      <button
        type="button"
        aria-label={t("remove", { name: participant.name })}
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
      <input type="hidden" name="participantRole" value={role} />
    </li>
  );
}
