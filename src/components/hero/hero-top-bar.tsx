import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { glassPill } from "./glass";

/**
 * The row of glass pills pinned to the top of a photo hero — a back link on
 * the left, the page's own actions (edit, delete, ...) on the right. Labels
 * collapse to icon-only below `sm` so three pills still fit beside the back
 * link on a phone without covering the photo.
 */
export function HeroTopBar({
  backHref,
  backLabel,
  actions,
}: {
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
}) {
  return (
    <div className="absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-2 sm:inset-x-7 sm:top-6">
      <Link href={backHref} className={glassPill} aria-label={backLabel}>
        <ArrowLeftIcon aria-hidden="true" />
        <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
