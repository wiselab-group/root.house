import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { personDisplayName } from "@/domain/person/display-name";
import { shortLifeSpan } from "@/domain/person/relation-label";
import type { PersonRecord } from "@/domain/person/person.repository";
import { PersonThumb } from "@/components/person/person-thumb";

/**
 * «Люди в этой истории» — the same avatar / name / subline row as the
 * Person Profile's family list (relative-list-item.tsx), so a person looks
 * the same wherever they're listed. The subline is their life span: the
 * app has no "who is this to the viewer" link yet.
 */
export function StoryPeople({
  people,
  familyId,
  familySlug,
}: {
  people: PersonRecord[];
  familyId: string;
  familySlug: string;
}) {
  if (people.length === 0) return null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="story-people">
      <h2 id="story-people" className="text-xl font-normal tracking-[-0.01em]">
        Люди в этой истории
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {people.map((person) => {
          const name = personDisplayName(person);
          const lifeSpan = shortLifeSpan(person);
          return (
            <li key={person.id}>
              <Link
                href={`/families/${familySlug}/people/${person.slug}`}
                className="group/row flex items-center gap-3.5 rounded-2xl p-2.5 transition-colors duration-200 ease-(--ease-reveal) hover:bg-glass-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <PersonThumb person={person} familyId={familyId} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[0.95rem] font-medium">
                    {name}
                  </span>
                  {lifeSpan && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {lifeSpan}
                    </span>
                  )}
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-foreground/35 transition-transform duration-200 ease-(--ease-reveal) group-hover/row:translate-x-0.5 group-hover/row:text-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
