"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { personDisplayName } from "@/domain/person/display-name";
import { Label } from "@/components/ui/label";
import { PersonPickerInput } from "@/components/person-picker/person-picker-input";
import { PersonPickerPopup } from "@/components/person-picker/person-picker-popup";
import { usePersonSearch } from "@/components/person-picker/use-person-search";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * The search-as-you-type input + popup portion of EventParticipantsField —
 * split out to keep the parent under the project's 150-line component
 * guideline. The field and rows are the shared person picker's.
 * `excludeIds` keeps already-added participants out of the results.
 */
export function EventParticipantSearch({
  familyId,
  excludeIds,
  onPick,
}: {
  familyId: string;
  excludeIds: string[];
  onPick: (person: PersonSearchResult) => void;
}) {
  const t = useTranslations("eventForm");
  const locale = useLocale();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const { results, isPending, search } = usePersonSearch(familyId);

  const selectableItems = results.filter((r) => !excludeIds.includes(r.id));

  return (
    <Combobox.Root<PersonSearchResult>
      items={selectableItems}
      filter={null}
      // Always null — this field never holds a "current selection" of its
      // own (each pick fires onPick and resets, see below), same pattern as
      // TagPersonCombobox.
      value={null}
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person, locale)}
      onValueChange={(person) => {
        if (!person) return;
        onPick(person);
        // Reset after a pick — this field stays mounted for adding more
        // people (unlike TagPersonCombobox, which closes its popover), so
        // leaving the picked name in the input would stale the next search.
        setQuery("");
        search("");
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        search(nextValue);
      }}
    >
      <Label htmlFor={inputId} className="text-sm font-medium">
        {t("participants")}
      </Label>
      <PersonPickerInput
        id={inputId}
        placeholder={t("addParticipant")}
        clearLabel={t("clearSearch")}
        className="mt-1.5"
      />
      <PersonPickerPopup
        familyId={familyId}
        isPending={isPending}
        query={query}
      />
    </Combobox.Root>
  );
}
