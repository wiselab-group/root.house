import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TreePine } from "lucide-react";

/**
 * The dashboard's single lead action — the family tree. Visually the
 * heaviest element on the page so the hierarchy reads "the tree is the
 * point, everything else supports it" instead of five identical tiles
 * (CLAUDE.md/impeccable: identical card grids are the generic-CRUD tell
 * this dashboard used to have) — but weight comes from a full terracotta
 * ring + tinted background + accent-colored heading/icon, not from a solid
 * terracotta fill: a first version filled the whole card and read as a
 * marketing banner, not a navigation card (user feedback on a live
 * screenshot — "тяжеловесная"). Card footprint (padding, type scale, icon
 * size) intentionally matches that first version — the size wasn't the
 * complaint, the fill was.
 */
export function FamilyTreeLaunchCard({
  href,
  description,
}: {
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl bg-primary/8 px-6 py-7 ring-1 ring-primary/30 transition-all duration-200 ease-(--ease-tree-focus) hover:-translate-y-0.5 hover:bg-primary/12 hover:ring-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <TreePine className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="font-heading text-2xl font-medium tracking-tight text-primary">
          Семейное дерево
        </span>
        <span className="max-w-md text-muted-foreground">{description}</span>
      </div>
      <ArrowRight
        className="size-5 shrink-0 text-primary transition-transform duration-200 ease-(--ease-tree-focus) group-hover:translate-x-1"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * A secondary section link (People / Photos / Places / Settings) — lighter
 * in every dimension than FamilyTreeLaunchCard: smaller type, no fill,
 * plain foreground icon. Deliberately not the same visual weight as the
 * tree card; see family-nav-card's module doc.
 */
export function FamilyNavCard({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2.5 rounded-xl px-4 py-4 ring-1 ring-border transition-colors hover:bg-accent/40 hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2">
        <Icon
          className="size-5 shrink-0 text-primary"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{description}</span>
    </Link>
  );
}
