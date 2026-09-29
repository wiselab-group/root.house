"use client";

import { useLocale, useTranslations } from "next-intl";
import { personDisplayName } from "@/domain/person/display-name";
import type { GalleryPhotoView } from "./gallery-photo";
import {
  ChipArrow,
  LightboxPersonChip,
  moreChipClass,
  personChipClass,
} from "./lightbox-person-chip";
import { LightboxPeopleList } from "./lightbox-people-list";
import { useChipFit } from "./use-chip-fit";

type TaggedPerson = GalleryPhotoView["people"][number];

/** gap-1.5 — the row's own gap, passed to the fit maths. */
const GAP_PX = 6;

/**
 * Desktop people row: one line of name chips, as many whole names as fit,
 * the rest behind «+N» (which opens the full list). A group photo of 20
 * never grows the strip, so the photo above it never jumps while paging.
 * Widths come from a hidden copy of the full row — see useChipFit.
 */
export function LightboxPeopleFit({
  people,
  familySlug,
  highlightedPersonId,
  onHighlight,
}: {
  /** Already in left-to-right order. */
  people: TaggedPerson[];
  familySlug: string;
  highlightedPersonId: string | null;
  onHighlight: (personId: string | null) => void;
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const signature = people.map((person) => person.id).join();
  const { containerRef, measureRef, visible } = useChipFit(signature, GAP_PX);
  const shown = visible ?? people.length;
  const hidden = people.length - shown;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          ref={measureRef}
          className="invisible absolute top-0 left-0 flex gap-1.5"
        >
          {people.map((person) => (
            <span key={person.id} className={personChipClass}>
              {personDisplayName(person, locale)}
              <ChipArrow lit={false} />
            </span>
          ))}
          <span className={moreChipClass}>+{people.length}</span>
        </div>
      </div>
      <div
        className={
          visible === null
            ? "flex justify-center gap-1.5 opacity-0"
            : "flex justify-center gap-1.5"
        }
      >
        {people.slice(0, shown).map((person) => (
          <LightboxPersonChip
            key={person.id}
            person={person}
            familySlug={familySlug}
            touch={false}
            highlighted={highlightedPersonId === person.id}
            onHighlight={onHighlight}
          />
        ))}
        {hidden > 0 && (
          <LightboxPeopleList
            people={people}
            familySlug={familySlug}
            touch={false}
            trigger={`+${hidden}`}
            triggerLabel={t("morePeople", { count: hidden })}
            onHighlight={onHighlight}
          />
        )}
      </div>
    </div>
  );
}
