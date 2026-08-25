import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * One launcher tile in the family dashboard's 2×2 section grid (tree /
 * people / places / settings). Plain <Link>, not the Button/LinkButton
 * primitive — this is a large clickable card, not a button-shaped control,
 * so it gets its own hover/focus treatment instead of Button's variants.
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
      className="group flex flex-col gap-3 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-primary/8 hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-base font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
    </Link>
  );
}
