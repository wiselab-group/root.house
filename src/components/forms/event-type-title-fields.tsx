import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { MANUAL_EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import type { EventType } from "@/domain/event/event.repository";

/** Type + title fields — split out of EditEventForm to keep it under the
 *  project's 150-line guideline. */
export function EventTypeTitleFields({
  eventType,
  onEventTypeChange,
  defaultTitle,
}: {
  eventType: EventType;
  onEventTypeChange: (type: EventType) => void;
  defaultTitle: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="type" className="text-xs text-muted-foreground">
          Тип
        </Label>
        <NativeSelect
          id="type"
          name="type"
          value={eventType}
          onChange={(e) => onEventTypeChange(e.target.value as EventType)}
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
        <Input id="title" name="title" defaultValue={defaultTitle} required />
      </div>
    </div>
  );
}
