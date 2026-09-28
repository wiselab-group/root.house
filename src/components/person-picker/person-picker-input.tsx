"use client";

import { Combobox } from "@base-ui/react/combobox";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The search field every person picker shares: magnifier, input, and a
 *  clear button (omitted with `clearLabel` unset — the photo-tag popover,
 *  which closes instead of clearing). */
export function PersonPickerInput({
  id,
  placeholder,
  clearLabel,
  autoFocus,
  className,
}: {
  id?: string;
  placeholder: string;
  clearLabel?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <Combobox.InputGroup
      className={cn(
        "relative flex h-11 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      <SearchIcon className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
      <Combobox.Input
        id={id}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn(
          "h-full w-full min-w-0 rounded-lg bg-transparent py-1 pl-10 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm",
          clearLabel ? "pr-9" : "pr-3",
        )}
      />
      {clearLabel && (
        <Combobox.Clear
          className="absolute right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={clearLabel}
        >
          <XIcon className="size-4" />
        </Combobox.Clear>
      )}
    </Combobox.InputGroup>
  );
}
