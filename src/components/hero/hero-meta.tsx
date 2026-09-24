import type { LucideIcon } from "lucide-react";

export interface HeroMetaItem {
  Icon: LucideIcon;
  label: string;
}

/** The quiet icon + text line under a hero title (dates, place, reading time). */
export function HeroMeta({ items }: { items: HeroMetaItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/65">
      {items.map(({ Icon, label }) => (
        <li key={label} className="flex items-center gap-1.5 tabular-nums">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
