import { Combobox } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";
import { PersonMultiComboboxItem } from "./person-multi-combobox-item";
import type { PersonSearchResult } from "@/domain/search/search.service";

/** The popup portion of PersonMultiCombobox (results list + empty/busy states) — split out to keep the parent under the project's 150-line component guideline. */
export function PersonMultiComboboxPopup({
  isPending,
  query,
}: {
  isPending: boolean;
  query: string;
}) {
  return (
    <Combobox.Portal>
      <Combobox.Positioner className="isolate z-50 outline-none" sideOffset={4}>
        <Combobox.Popup
          className={cn(
            "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
          aria-busy={isPending || undefined}
        >
          <div className="max-h-72 overflow-y-auto overscroll-contain p-1 scroll-pt-1 scroll-pb-1">
            <Combobox.Status className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
              {isPending ? "Ищем…" : null}
            </Combobox.Status>
            <Combobox.Empty className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
              {!isPending
                ? query.trim().length > 0
                  ? "Ничего не найдено."
                  : "В семье пока никого нет."
                : null}
            </Combobox.Empty>
            <Combobox.List>
              {(person: PersonSearchResult) => (
                <PersonMultiComboboxItem key={person.id} person={person} />
              )}
            </Combobox.List>
          </div>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}
