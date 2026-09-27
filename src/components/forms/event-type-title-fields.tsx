import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { MANUAL_EVENT_TYPES } from "@/domain/event/event-roles";
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
  const t = useTranslations("eventForm");
  const tTypes = useTranslations("eventTypes");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="type" className="text-xs text-muted-foreground">
          {t("type")}
        </Label>
        <NativeSelect
          id="type"
          name="type"
          value={eventType}
          onChange={(e) => onEventTypeChange(e.target.value as EventType)}
        >
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
        <Input id="title" name="title" defaultValue={defaultTitle} required />
      </div>
    </div>
  );
}
