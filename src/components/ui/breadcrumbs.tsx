import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Trail of ancestor pages, rendered in AppHeader (see breadcrumbs-context.tsx
 * for how a page's own trail gets there). The current page is always the
 * last item and never a link — every earlier item, including the immediate
 * parent, is reachable with one click, so there's no separate "back" control
 * to keep in sync.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm text-muted-foreground">
      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon className="size-3.5 shrink-0" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="truncate hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn("truncate", isLast && "text-foreground")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
