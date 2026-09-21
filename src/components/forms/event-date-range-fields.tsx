import { Checkbox } from "@/components/ui/checkbox";
import { PersonDateFields } from "./person-date-fields";
import type { PartialDate } from "@/domain/shared/partial-date";

/** Date + optional end-date fields — split out of EditEventForm to keep
 *  it under the project's 150-line guideline. */
export function EventDateRangeFields({
  date,
  endDate,
  showRange,
  onShowRangeChange,
}: {
  date: PartialDate | null;
  endDate: PartialDate | null;
  showRange: boolean;
  onShowRangeChange: (checked: boolean) => void;
}) {
  return (
    <>
      <PersonDateFields prefix="date" legend="Дата" date={date} />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox checked={showRange} onCheckedChange={onShowRangeChange} />
        Есть дата окончания (например, военная служба)
      </label>
      {showRange && (
        <PersonDateFields
          prefix="endDate"
          legend="Дата окончания"
          date={endDate}
        />
      )}
    </>
  );
}
