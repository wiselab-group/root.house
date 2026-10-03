"use client";

import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";

/** The open search field, focused on arrival, with a way back. */
export function SearchField({
  query,
  onQuery,
  onCancel,
}: {
  query: string;
  onQuery: (query: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("familyMap");
  return (
    <div className="flex items-center gap-2">
      <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border-[1.5px] border-primary bg-background/40 px-3.5 ring-4 ring-primary/15">
        <SearchIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          // The panel IS the search here — the user opened it to type.
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <button
        type="button"
        onClick={onCancel}
        className="h-11 cursor-pointer px-1.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
