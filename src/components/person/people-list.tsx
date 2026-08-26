"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PersonAvatar } from "@/components/person/person-avatar";
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
        <Card>
          <CardHeader>
            <CardTitle>Ничего не найдено</CardTitle>
            <CardDescription>Попробуйте изменить запрос.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((person) => (
            <li key={person.id}>
              <Link href={`/families/${familySlug}/people/${person.slug}`}>
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader className="flex! flex-row items-center gap-3">
                    <PersonAvatar
                      person={person}
                      familyId={familyId}
                      size="lg"
                      className="size-14! text-base"
                    />
                    <div>
                      <CardTitle>
                        {personDisplayName(person)}
                        {person.maidenName && person.maidenName !== person.lastName && (
                          // Same "differs from lastName" guard as the tree's
                          // person combobox — a placeholder person or someone
                          // whose maiden name IS their current last name
                          // shouldn't show a redundant "(Smith) Smith".
                          <span className="font-normal text-muted-foreground"> ({person.maidenName})</span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {formatPartialDate(person.birthDate)}
                        {person.isLiving ? "" : ` — ${formatPartialDate(person.deathDate)}`}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
