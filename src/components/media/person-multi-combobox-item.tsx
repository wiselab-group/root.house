import { Combobox } from "@base-ui/react/combobox";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import type { PersonSearchResult } from "@/domain/search/search.service";

/** One search result row in PersonMultiCombobox's popup list — split out to keep the parent under the project's 150-line component guideline. */
export function PersonMultiComboboxItem({
  person,
}: {
  person: PersonSearchResult;
}) {
  return (
    <Combobox.Item
      value={person}
      className="flex cursor-default flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
    >
      <span className="font-medium">
        {personDisplayName(person)}
        {person.maidenName && person.maidenName !== person.lastName && (
          <span className="font-normal text-muted-foreground">
            {" "}
            ({person.maidenName})
          </span>
        )}
      </span>
      {(person.birthDate || person.deathDate) && (
        <span className="text-xs text-muted-foreground">
          {formatPartialDate(person.birthDate)}
          {person.deathDate && ` — ${formatPartialDate(person.deathDate)}`}
        </span>
      )}
    </Combobox.Item>
  );
}
