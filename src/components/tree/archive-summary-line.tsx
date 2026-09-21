import type { PersonArchiveSummary } from "@/domain/tree/tree-layout.builder";
import {
  photoCountLabel,
  storyCountLabel,
  eventCountLabel,
} from "@/domain/shared/pluralize-ru";

/**
 * Written-out archive summary (PersonArchiveSummary) for the card's click
 * popover — the tree card itself stays plain (no icon indicators there by
 * design, see person-node-popover-actions.tsx's own doc comment: the
 * popover is where a deliberate look at one person lives, not a glance
 * across the whole tree), so this is the ONLY place archive counts show up
 * in the tree UI. Words ("4 фото, 2 истории") rather than bare icon+digit
 * pairs, since there's room here and it's read deliberately. Same
 * empty-state rule as the rest of Phase 1: a person with no visible archive
 * content renders nothing (see PersonArchiveSummary's own doc comment on
 * why zero content and zero VISIBLE content look identical — intentional,
 * not a bug here either).
 */
export function ArchiveSummaryLine({
  archive,
  className,
}: {
  archive: PersonArchiveSummary;
  className?: string;
}) {
  const parts = [
    archive.photoCount > 0 ? photoCountLabel(archive.photoCount) : null,
    archive.storyCount > 0 ? storyCountLabel(archive.storyCount) : null,
    archive.eventCount > 0 ? eventCountLabel(archive.eventCount) : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return null;

  return <p className={className}>{parts.join(", ")}</p>;
}
