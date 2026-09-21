import type { PersonArchiveSummary } from "@/domain/tree/tree-layout.builder";
import {
  photoCountLabel,
  storyCountLabel,
  eventCountLabel,
} from "@/domain/shared/pluralize-ru";

/**
 * Written-out archive summary (PersonArchiveSummary — photo/story/event
 * counts, already viewer-filtered server-side, see archive-summary.ts's own
 * doc comment on the privacy rule) — "4 фото, 2 истории" rather than bare
 * icon+digit pairs, meant for a deliberate look at one person rather than a
 * glance across many. Two call sites: the tree card's click popover
 * (person-node-popover-actions.tsx — the ONLY place archive counts show up
 * in the tree UI, the card itself stays plain by design) and the Person
 * Profile page's own archive overview (person-archive-overview.tsx). Same
 * empty-state rule in both: a person with no visible archive content
 * renders nothing (see PersonArchiveSummary's own doc comment on why zero
 * content and zero VISIBLE content look identical — intentional, not a bug
 * here either).
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
