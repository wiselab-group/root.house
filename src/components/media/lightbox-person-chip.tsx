"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import type { GalleryPhotoView } from "./gallery-photo";

type TaggedPerson = GalleryPhotoView["people"][number];

/** One name chip in the lightbox's bottom strip — name only, no avatar: the
 *  face is right there on the photo, and the spotlight points at it (user
 *  request 2026-09-29). Shared with the hidden measuring copy in
 *  LightboxPeopleFit, so both must stay the same size. */
export const personChipClass =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-glass-edge bg-glass pr-1.5 pl-3 text-sm font-medium whitespace-nowrap text-foreground backdrop-blur-xl transition-colors duration-fast ease-(--ease-reveal) outline-none hover:bg-glass-strong focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

/** «+N» and the phone's count chip — same pill, no arrow. */
export const moreChipClass = cn(
  personChipClass,
  "px-3 tabular-nums text-muted-foreground hover:text-foreground aria-expanded:bg-foreground aria-expanded:text-background",
);

/** The ↗ that says the chip opens the profile: dim at rest, lit with the
 *  person. Always there, so lighting a chip never changes its width. */
export function ChipArrow({ lit }: { lit: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 items-center justify-center rounded-full transition-[opacity,background-color] duration-fast ease-(--ease-reveal) motion-reduce:transition-none",
        lit ? "bg-glass-strong opacity-100" : "opacity-45",
      )}
    >
      <ArrowUpRightIcon className="size-3.5" />
    </span>
  );
}

/**
 * Desktop: hover or focus lights the person on the photo, click opens the
 * profile. Touch has no hover, so there the name is a toggle — tap to
 * light the person up, tap again to clear — and the profile is one more
 * deliberate tap on the ↗ inside the lit chip (user request 2026-09-26).
 */
export function LightboxPersonChip({
  person,
  familySlug,
  touch,
  highlighted,
  onHighlight,
}: {
  person: TaggedPerson;
  familySlug: string;
  touch: boolean;
  highlighted: boolean;
  onHighlight: (personId: string | null) => void;
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const name = personDisplayName(person, locale);
  const href = `/families/${familySlug}/people/${person.slug}`;
  const lit = highlighted && "bg-glass-strong";

  if (touch) {
    return (
      <span className={cn(personChipClass, "p-0", lit)}>
        <button
          type="button"
          aria-pressed={highlighted}
          onClick={() => onHighlight(highlighted ? null : person.id)}
          className={cn(
            "h-full cursor-pointer pl-3 outline-none",
            highlighted ? "pr-1" : "pr-3",
          )}
        >
          {name}
        </button>
        {highlighted && (
          <Link
            href={href}
            aria-label={t("openProfileOf", { name })}
            className="mr-1 flex size-6 items-center justify-center rounded-full bg-glass-strong transition-colors active:bg-foreground/30"
          >
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
        )}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onMouseEnter={() => onHighlight(person.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(person.id)}
      onBlur={() => onHighlight(null)}
      className={cn(personChipClass, lit)}
    >
      {name}
      <ChipArrow lit={highlighted} />
    </Link>
  );
}
