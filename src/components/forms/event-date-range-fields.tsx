import { useTranslations } from "next-intl";
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
  const t = useTranslations("eventForm");
  return (
    <>
      <PersonDateFields prefix="date" legend={t("date")} date={date} />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox checked={showRange} onCheckedChange={onShowRangeChange} />
        {t("hasEnd")}
      </label>
      {showRange && (
        <PersonDateFields
          prefix="endDate"
          legend={t("endDate")}
          date={endDate}
        />
      )}
    </>
  );
}
