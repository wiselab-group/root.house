import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TreeDeciduous } from "lucide-react";
import { glassSurface } from "@/components/hero/glass";

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
 * complaint, the fill was. On the dark Family Home (same style as the
 * profile) it's a glass surface; the terracotta ring and icon stay the
 * accent.
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
      className={`${glassSurface} group flex cursor-pointer items-center gap-4 rounded-3xl px-6 py-7 ring-1 ring-primary/35 transition-[background-color,transform,box-shadow] duration-200 ease-(--ease-tree-focus) hover:-translate-y-0.5 hover:bg-glass-strong hover:ring-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-8`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <TreeDeciduous
          className="size-5"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="font-heading text-2xl font-medium tracking-tight">
          Семейное дерево
        </span>
        <span className="max-w-md text-foreground/60">{description}</span>
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
 * description line count. Glass on the dark Family Home.
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
      className={`${glassSurface} group flex h-full cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 transition-[background-color,transform] duration-200 ease-(--ease-tree-focus) hover:-translate-y-0.5 hover:bg-glass-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-glass-strong text-foreground/80 transition-colors group-hover:text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-foreground/55">{description}</span>
      </div>
    </Link>
  );
}
