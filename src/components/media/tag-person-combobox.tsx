"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonPickerInput } from "@/components/person-picker/person-picker-input";
import { PersonPickerPopup } from "@/components/person-picker/person-picker-popup";
import { usePersonSearch } from "@/components/person-picker/use-person-search";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Compact single-select person picker for the photo-tag popover
 * (photo-tag-layer.tsx) — the shared person-picker field and rows, but no
 * persistent label, no controlled value/clear affordance: fires onSelect
 * immediately once a person is picked so the caller can close the popover
 * right away. Already-tagged people are NOT excluded from results —
 * re-selecting one just moves their existing point (server-side upsert).
 */
export function TagPersonCombobox({
  familyId,
  onSelect,
  autoFocus,
  className,
}: {
  familyId: string;
  onSelect: (person: { id: string; name: string }) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const { results, isPending, search } = usePersonSearch(familyId);

  return (
    <Combobox.Root<PersonSearchResult>
      items={results}
      filter={null}
      value={null}
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person, locale)}
      onValueChange={(person) => {
        if (!person) return;
        onSelect({ id: person.id, name: personDisplayName(person, locale) });
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        search(nextValue);
      }}
    >
      <PersonPickerInput
        autoFocus={autoFocus}
        placeholder={t("whoIsThis")}
        className={className}
      />
      <PersonPickerPopup
        familyId={familyId}
        isPending={isPending}
        query={query}
      />
    </Combobox.Root>
  );
}
