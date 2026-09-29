"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowUpRightIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GalleryPhotoView } from "./gallery-photo";
import { moreChipClass } from "./lightbox-person-chip";

type TaggedPerson = GalleryPhotoView["people"][number];

/** Past this many names the list gets a search field. */
const SEARCH_FROM = 12;

const rowClass =
  "flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors duration-fast outline-none hover:bg-glass focus-visible:bg-glass focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Everyone tagged on the photo, numbered left to right — behind the «+N»
 * chip on desktop and the «👤 N» chip on phones, so the strip itself stays
 * one line however many people are on a group photo. Hovering a name (or
 * tapping it on a phone) lights the person on the photo.
 */
export function LightboxPeopleList({
  people,
  familySlug,
  touch,
  trigger,
  triggerLabel,
  onHighlight,
}: {
  /** Already in left-to-right order. */
  people: TaggedPerson[];
  familySlug: string;
  touch: boolean;
  trigger: ReactNode;
  triggerLabel: string;
  onHighlight: (personId: string | null) => void;
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase(locale);
  const rows = people
    .map((person, index) => ({
      person,
      number: index + 1,
      name: personDisplayName(person, locale),
    }))
    .filter(
      ({ name }) => !needle || name.toLocaleLowerCase(locale).includes(needle),
    );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          onHighlight(null);
        }
      }}
    >
      <PopoverTrigger className={moreChipClass} aria-label={triggerLabel}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={10}
        className="flex max-h-[min(24rem,60dvh)] w-[min(28rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-2xl border border-glass-edge bg-popover/95 p-3 shadow-xl shadow-black/40 ring-0 backdrop-blur-xl"
      >
        <div className="flex items-baseline justify-between gap-2 px-1">
          <p className="text-sm font-medium">
            {t("taggedCount", { count: people.length })}
          </p>
          <p className="text-xs text-muted-foreground">{t("leftToRight")}</p>
        </div>
        {people.length > SEARCH_FROM && (
          <label className="relative block">
            <span className="sr-only">{t("findByName")}</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("findByName")}
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-glass-edge bg-glass pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>
        )}
        <ul className="grid min-h-0 grid-cols-1 gap-0.5 overflow-y-auto sm:grid-cols-2">
          {rows.map(({ person, number, name }) => (
            <li key={person.id} className="min-w-0">
              <PeopleListRow
                href={`/families/${familySlug}/people/${person.slug}`}
                number={number}
                name={name}
                touch={touch}
                onLight={() => onHighlight(person.id)}
                onPick={() => {
                  onHighlight(person.id);
                  setOpen(false);
                }}
                onClear={() => onHighlight(null)}
              />
            </li>
          ))}
        </ul>
        {rows.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {t("nobodyFound")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Desktop: the row IS the profile link, hover lights the face. Touch: the
 *  name lights the face and closes the list; the ↗ opens the profile. */
function PeopleListRow({
  href,
  number,
  name,
  touch,
  onLight,
  onPick,
  onClear,
}: {
  href: string;
  number: number;
  name: string;
  touch: boolean;
  onLight: () => void;
  onPick: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("media");
  const label = (
    <>
      <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {number}
      </span>
      <span className="truncate">{name}</span>
    </>
  );
  if (!touch) {
    return (
      <Link
        href={href}
        onMouseEnter={onLight}
        onMouseLeave={onClear}
        onFocus={onLight}
        onBlur={onClear}
        className={rowClass}
      >
        {label}
      </Link>
    );
  }
  return (
    <div className="flex items-center">
      <button type="button" onClick={onPick} className={cn(rowClass, "flex-1")}>
        {label}
      </button>
      <Link
        href={href}
        aria-label={t("openProfileOf", { name })}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-glass active:bg-glass-strong"
      >
        <ArrowUpRightIcon className="size-4" />
      </Link>
    </div>
  );
}
