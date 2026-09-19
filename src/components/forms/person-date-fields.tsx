import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * A PartialDate input group (year/month/day + "approximate" checkbox).
 * Genealogical dates are frequently incomplete, so only the year is required
 * — month/day are progressive detail, not mandatory fields.
 *
 * `prefix` is just a form-field-name/id namespace (e.g. "birth" -> birthYear,
 * birthMonth, ...) — generic enough to reuse for Person birth/death dates
 * and Event date/endDate, not tied to any one entity.
 */
export function PersonDateFields({
  prefix,
  legend,
  date,
}: {
  prefix: string;
  legend: string;
  date?: PartialDate | null;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium mb-1">{legend}</legend>
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${prefix}Day`}
            className="text-xs text-muted-foreground"
          >
            День
          </Label>
          <Input
            id={`${prefix}Day`}
            name={`${prefix}Day`}
            type="number"
            min={1}
            max={31}
            defaultValue={date?.day ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${prefix}Month`}
            className="text-xs text-muted-foreground"
          >
            Месяц
          </Label>
          <Input
            id={`${prefix}Month`}
            name={`${prefix}Month`}
            type="number"
            min={1}
            max={12}
            defaultValue={date?.month ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${prefix}Year`}
            className="text-xs text-muted-foreground"
          >
            Год
          </Label>
          <Input
            id={`${prefix}Year`}
            name={`${prefix}Year`}
            type="number"
            min={1}
            max={2100}
            defaultValue={date?.year ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span aria-hidden="true" className="text-xs leading-4">
            &nbsp;
          </span>
          <label
            htmlFor={`${prefix}Approximate`}
            className="flex h-11 items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Checkbox
              id={`${prefix}Approximate`}
              name={`${prefix}Approximate`}
              defaultChecked={date?.isApproximate ?? false}
            />
            примерно
          </label>
        </div>
      </div>
    </fieldset>
  );
}
