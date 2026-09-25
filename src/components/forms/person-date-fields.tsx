import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * A PartialDate input group (year/month/day + "approximate" checkbox).
 * Genealogical dates are frequently incomplete, so only the year is required
 * — month/day are progressive detail, not mandatory fields.
 *
 * Laid out by the width of wherever it's placed (a container query on the
 * fieldset), not the viewport: the same fields sit in a narrow dialog on a
 * wide desktop screen, where a viewport breakpoint gave them four columns
 * and clipped the year. Day/month/year share one row once it fits (~16rem),
 * and stack one per line below that; «примерно» joins the row only when
 * there's room for all four (~28rem), otherwise it sits on its own line.
 * Number spinners are hidden — they ate a third of a narrow field.
 *
 * `prefix` is just a form-field-name/id namespace (e.g. "birth" -> birthYear,
 * birthMonth, ...) — generic enough to reuse for Person birth/death dates
 * and Event date/endDate, not tied to any one entity.
 */
const NUMBER_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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
    <fieldset className="@container flex flex-col gap-2">
      <legend className="text-sm font-medium mb-1">{legend}</legend>
      <div className="grid grid-cols-1 items-end gap-2 @3xs:grid-cols-[minmax(3.5rem,1fr)_minmax(3.5rem,1fr)_minmax(5rem,1.5fr)] @md:grid-cols-[minmax(3.5rem,1fr)_minmax(3.5rem,1fr)_minmax(5rem,1.5fr)_auto]">
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
            inputMode="numeric"
            className={NUMBER_INPUT}
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
            inputMode="numeric"
            className={NUMBER_INPUT}
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
            inputMode="numeric"
            className={NUMBER_INPUT}
            min={1}
            max={2100}
            defaultValue={date?.year ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1 @3xs:col-span-3 @md:col-span-1">
          <span
            aria-hidden="true"
            className="hidden text-xs leading-4 @md:block"
          >
            &nbsp;
          </span>
          <label
            htmlFor={`${prefix}Approximate`}
            className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground @md:h-11"
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
