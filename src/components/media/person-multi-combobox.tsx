"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonPickerInput } from "@/components/person-picker/person-picker-input";
import { PersonPickerPopup } from "@/components/person-picker/person-picker-popup";
import {
  pinnedPerson,
  usePersonSearch,
} from "@/components/person-picker/use-person-search";
import { RemovableChipList } from "./removable-chip-list";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Search-as-you-type picker for SEVERAL people at once (a story's people) —
 * the shared person-picker field and rows (components/person-picker), as in
 * tree/person-combobox.tsx's PersonCombobox, but
 * with `multiple` so a group photo can be tagged with everyone in it at
 * once. Selected people render as removable chips under the input rather
 * than filling the input's own text (which single-select does).
 *
 * Not placed under components/tree/ — this is a media-feature person
 * picker, not a tree-specific one (the "no @xyflow/react outside
 * components/tree/" rule doesn't apply here, this component uses neither).
 */
export function PersonMultiCombobox({
  familyId,
  label,
  value,
  onChange,
  className,
}: {
  familyId: string;
  label: string;
  value: { id: string; name: string }[];
  onChange: (people: { id: string; name: string }[]) => void;
  className?: string;
}) {
  const tc = useTranslations("common");
  const locale = useLocale();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const { results, isPending, search } = usePersonSearch(familyId);

  // Selected people may fall out of the latest search results (query
  // changed since they were picked) — pin them as items so Combobox can
  // still render them as selected even when they're not in `results`.
  const items = useMemo(() => {
    const missing = value.filter(
      (person) => !results.some((r) => r.id === person.id),
    );
    return [
      ...results,
      ...missing.map((person) => pinnedPerson(person.id, person.name)),
    ];
  }, [results, value]);

  const selectedValues = useMemo(
    () =>
      value
        .map((person) => items.find((item) => item.id === person.id))
        .filter((item): item is PersonSearchResult => item != null),
    [value, items],
  );

  function removePerson(id: string) {
    onChange(value.filter((person) => person.id !== id));
  }

  return (
    <Combobox.Root<PersonSearchResult, true>
      multiple
      items={items}
      filter={null}
      value={selectedValues}
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person, locale)}
      onValueChange={(people) => {
        onChange(
          people.map((person) => ({
            id: person.id,
            name: personDisplayName(person, locale),
          })),
        );
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        search(nextValue);
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <PersonPickerInput
          id={inputId}
          placeholder={tc("personSearchPlaceholder")}
          clearLabel={tc("clearSearch")}
        />

        <RemovableChipList items={value} onRemove={removePerson} />
      </div>

      <PersonPickerPopup
        familyId={familyId}
        isPending={isPending}
        query={query}
      />
    </Combobox.Root>
  );
}
