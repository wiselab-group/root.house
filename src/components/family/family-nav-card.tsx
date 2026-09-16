import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TreeDeciduous } from "lucide-react";

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
        <TreeDeciduous
          className="size-5"
          strokeWidth={1.75}
          aria-hidden="true"
        />
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
 * A secondary section link (People / Photos / Places / Settings) — still
 * lighter than FamilyTreeLaunchCard (no terracotta, no fill on the card
 * itself — that stays exclusive to the tree card, see its module doc, and
 * no shadow — flat like the rest of the app's non-tree surfaces), but a
 * solid `bg-card` surface gives each tile real object presence instead of
 * reading as outlined whitespace, and the icon sits in a filled neutral
 * roundel (the product register's "second neutral layer", `bg-muted` —
 * never `bg-primary/*`) so it carries weight without competing with the
 * tree card's action color. `h-full` on the tile + `items-stretch` on the
 * grid (page.tsx) keep all four tiles the same height regardless of
 * description line count.
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
      className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-all duration-200 ease-(--ease-tree-focus) hover:-translate-y-0.5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-primary/12 group-hover:text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold tracking-tight">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
    </Link>
  );
}
