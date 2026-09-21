import { ImageIcon, BookOpenIcon, CalendarIcon } from "lucide-react";
import type { PersonArchiveSummary } from "@/domain/tree/tree-layout.builder";

/**
 * Phase 1 "Tree as Map of the Family Archive" — a quiet row of icon+count
 * pairs communicating "this person has family history attached" without
 * turning the card into a dashboard (see CLAUDE.md's own Step 6/9: no large
 * labels, no color-coded density, indicators stay visually secondary to
 * name/years). Only non-zero counts render at all — a person with no
 * archive content shows nothing here (see compact-card-body.tsx's own
 * caller: this returns null rather than an empty row so it never reserves
 * layout space either), matching CLAUDE.md's Step 10 empty-state rule.
 * text-muted-foreground throughout, same as every other secondary label on
 * this card (yearRange, etc.) — archive presence is a quiet signal, never
 * competing with the sage/terracotta identity colors reserved for the
 * relationship graph itself.
 */
export function ArchiveIndicators({
  archive,
  className,
}: {
  archive: PersonArchiveSummary;
  className?: string;
}) {
  const items = [
    { key: "photo", Icon: ImageIcon, count: archive.photoCount, label: "фото" },
    {
      key: "story",
      Icon: BookOpenIcon,
      count: archive.storyCount,
      label: "историй",
    },
    {
      key: "event",
      Icon: CalendarIcon,
      count: archive.eventCount,
      label: "событий",
    },
  ].filter((item) => item.count > 0);

  if (items.length === 0) return null;

  return (
    <div
      className={className}
      aria-label={items.map((item) => `${item.count} ${item.label}`).join(", ")}
    >
      {items.map(({ key, Icon, count }) => (
        <span key={key} className="inline-flex items-center gap-0.5">
          <Icon className="size-2.5" aria-hidden="true" />
          {count}
        </span>
      ))}
    </div>
  );
}
