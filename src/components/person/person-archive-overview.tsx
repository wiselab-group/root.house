import Link from "next/link";
import { ImageIcon, BookOpenIcon, CalendarIcon } from "lucide-react";
import type { PersonArchiveSummary } from "@/domain/tree/tree-layout.builder";
import {
  photoCountLabel,
  storyCountLabel,
  eventCountLabel,
} from "@/domain/shared/pluralize-ru";

/**
 * The Profile page's own equivalent of the tree popover's ArchiveSummaryLine
 * — a row of jump links ("N фото" -> #photos, "N историй" -> #stories, "N
 * событий" -> #timeline) right under the header, so a visitor arriving from
 * the tree's "Посмотреть профиль" (which already promised this same summary
 * in the popover — see person-node-popover-actions.tsx) gets an immediate
 * answer to "what's here" instead of having to scroll through Основная
 * информация/Описание/Семья first. Terracotta (--primary) for the numbers —
 * the app's one emphasis/action color everywhere outside the tree (see
 * CLAUDE.md's DESIGN TOKENS: sage/branch are tree-only, terracotta is not) —
 * paired with each ProfileSection's own `count` prop (profile-section.tsx),
 * which renders the same terracotta number next to the section heading once
 * scrolled into.
 *
 * Same empty-state rule as ArchiveSummaryLine: a category with 0 visible
 * items is omitted entirely, never shown as "0 фото" — and the whole
 * component renders nothing when every count is 0, so a person with no
 * archive content yet shows no empty overview bar at all.
 */
export function PersonArchiveOverview({
  archive,
}: {
  archive: PersonArchiveSummary;
}) {
  const items = [
    archive.photoCount > 0
      ? {
          href: "#photos",
          Icon: ImageIcon,
          label: photoCountLabel(archive.photoCount),
        }
      : null,
    archive.storyCount > 0
      ? {
          href: "#stories",
          Icon: BookOpenIcon,
          label: storyCountLabel(archive.storyCount),
        }
      : null,
    archive.eventCount > 0
      ? {
          href: "#timeline",
          Icon: CalendarIcon,
          label: eventCountLabel(archive.eventCount),
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Обзор архива"
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {items.map(({ href, Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
