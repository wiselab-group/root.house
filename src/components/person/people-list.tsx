"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PersonThumb } from "@/components/person/person-thumb";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { personCountLabel } from "@/domain/shared/pluralize-ru";
import type { PersonRecord } from "@/domain/person/person.repository";

/** Case/diacritic-insensitive substring match — Cyrillic ё/е and similar
 *  aren't normalized (out of scope for client-side filtering), just plain
 *  lowercasing so "иванов"/"Иванов" match regardless of how it was typed. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function personMatches(person: PersonRecord, query: string): boolean {
  const haystack = [
    person.firstName,
    person.lastName,
    person.maidenName,
    person.nickname,
    person.birthDate?.year?.toString(),
    person.deathDate?.year?.toString(),
  ]
    .filter(Boolean)
    .join(" ");
  return normalize(haystack).includes(query);
}

/**
 * Instant search-as-you-type over an already-loaded people list — the full
 * list is small (a family archive, not a phone book) and was already fetched
 * server-side under requireFamilyAccess, so filtering it in the browser on
 * every keystroke avoids a network round-trip per letter typed. Matches
 * name/maiden name/nickname/birth-or-death year, all client-side.
 *
 * Rendered as one divide-y list (not a Card per row) — same "archive list,
 * not a stack of boxes" treatment as /families' own list, see that page's
 * doc history. A dense phone-book style row: avatar, name, dates, arrow —
 * the avatar is PersonThumb, the same rounded-square sage-ringed portrait
 * as the profile's family list and a story's people.
 */
export function PeopleList({
  familyId,
  familySlug,
  people,
}: {
  familyId: string;
  familySlug: string;
  people: PersonRecord[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (q.length === 0) return people;
    return people.filter((person) => personMatches(person, q));
  }, [people, query]);

  return (
    <div className="flex flex-col gap-6">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Иванов, Анна, 1924…"
        aria-label="Поиск по людям"
      />

      {query.trim().length > 0 && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Найдено {personCountLabel(filtered.length)} из {people.length}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ничего не найдено — попробуйте изменить запрос.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {filtered.map((person, index) => (
            <li
              key={person.id}
              className="animate-content-enter"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <Link
                href={`/families/${familySlug}/people/${person.slug}`}
                className="group/row flex items-center justify-between gap-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <PersonThumb person={person} familyId={familyId} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-heading text-lg font-medium transition-colors group-hover/row:text-primary">
                      {personDisplayName(person)}
                      {person.maidenName &&
                        person.maidenName !== person.lastName && (
                          // Same "differs from lastName" guard as the tree's
                          // person combobox — a placeholder person or someone
                          // whose maiden name IS their current last name
                          // shouldn't show a redundant "(Smith) Smith".
                          <span className="font-sans font-normal text-muted-foreground">
                            {" "}
                            ({person.maidenName})
                          </span>
                        )}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {formatPartialDate(person.birthDate)}
                      {person.isLiving
                        ? ""
                        : ` — ${formatPartialDate(person.deathDate)}`}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  className="size-5 shrink-0 text-muted-foreground/60 transition-all duration-200 ease-(--ease-tree-focus) group-hover/row:translate-x-1 group-hover/row:text-primary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
