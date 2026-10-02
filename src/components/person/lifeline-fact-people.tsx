import Link from "next/link";
import { ArchiveImage } from "@/components/media/archive-image";
import type { FactPerson } from "./timeline-facts";

/**
 * A Линия жизни card's line about other people — «Родители», «Супруга»,
 * «Участники» — as the people themselves: each one their face (or
 * initials) in the app's rounded-square avatar with the sage identity
 * ring (PersonThumb) and their name, opening that person's profile; the
 * small label leads the same row (kept compact, user pick 2026-10-02).
 * No pill around them: the card is already a glass surface, and a
 * bordered chip inside it read as a card in a card.
 */
export function LifelineFactPeople({
  label,
  people,
}: {
  label: string;
  people: FactPerson[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="text-xs font-medium text-foreground/50">{label}:</span>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* flex, not inline: an inline link sits on the text baseline, and
            a photo avatar (no text in it) rode higher than an initials one. */}
        {people.map((person) => (
          <li key={person.id} className="flex">
            <Link
              href={person.href}
              className="group/person -m-1 flex items-center gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-glass-strong text-[11px] font-medium text-foreground/60 ring-1 ring-tree-accent">
                {person.photoUrl ? (
                  <ArchiveImage
                    src={person.photoUrl}
                    alt=""
                    fill
                    sizes="28px"
                    className="object-cover object-[50%_25%]"
                  />
                ) : (
                  person.initials
                )}
              </span>
              <span className="text-foreground/85 decoration-foreground/35 underline-offset-4 transition-colors duration-fast ease-(--ease-reveal) group-hover/person:text-foreground group-hover/person:underline motion-reduce:transition-none">
                {person.name}
              </span>
              {person.role && (
                <span className="text-foreground/50">{person.role}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
