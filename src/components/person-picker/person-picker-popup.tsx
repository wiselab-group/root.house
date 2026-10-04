"use client";

import { useTranslations } from "next-intl";
import { Combobox } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";
import { PersonOption } from "./person-option";
import type { PersonSearchResult } from "@/domain/search/search.service";

/** The results popup every person picker shares — searching / nothing
 *  found / empty-family states, then one PersonOption per result. At
 *  least 16rem wide so a row with a thumb and years fits even under a
 *  narrow input. */
export function PersonPickerPopup({
  familyId,
  isPending,
  query,
}: {
  familyId: string;
  isPending: boolean;
  query: string;
}) {
  const tc = useTranslations("common");
  return (
    <Combobox.Portal>
      <Combobox.Positioner className="isolate z-50 outline-none" sideOffset={4}>
        <Combobox.Popup
          className={cn(
            "w-(--anchor-width) max-w-(--available-width) min-w-64 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-instant outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
          aria-busy={isPending || undefined}
        >
          <div className="scroll-fade [--scroll-fade-size:1rem] max-h-72 overflow-y-auto overscroll-contain p-1 scroll-pt-1 scroll-pb-1">
            <Combobox.Status className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
              {isPending ? tc("searching") : null}
            </Combobox.Status>
            <Combobox.Empty className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
              {!isPending
                ? query.trim().length > 0
                  ? tc("nothingFound")
                  : tc("noPeople")
                : null}
            </Combobox.Empty>
            <Combobox.List>
              {(person: PersonSearchResult) => (
                <PersonOption
                  key={person.id}
                  person={person}
                  familyId={familyId}
                />
              )}
            </Combobox.List>
          </div>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}
