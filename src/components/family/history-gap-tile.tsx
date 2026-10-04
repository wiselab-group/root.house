import Link from "next/link";
import { useTranslations } from "next-intl";
import { PersonThumb } from "@/components/person/person-thumb";
import { useGapWording, type HistoryGapItem } from "./history-gap-wording";

/**
 * One of the further questions under the lead one — the whole tile links
 * to where the answer goes (a Link stretched over it), «Мы не знаем» sits
 * above that link, since a button can't nest inside an <a> (the same
 * pattern as relative-list-item.tsx).
 */
export function HistoryGapTile({
  gap,
  familyId,
  familySlug,
  onDismiss,
}: {
  gap: HistoryGapItem;
  familyId: string;
  familySlug: string;
  onDismiss: () => void;
}) {
  const t = useTranslations("familyHome");
  const { name, question, href } = useGapWording(gap, familySlug);
  return (
    <li className="group/tile animate-content-enter relative flex min-w-0 flex-col gap-3 rounded-2xl border border-glass-edge bg-glass p-4 transition-[background-color,translate] duration-base ease-(--ease-tree-focus) hover:-translate-y-0.5 hover:bg-glass-strong">
      <Link
        href={href}
        className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`${name}: ${question}`}
      />
      <div className="pointer-events-none flex min-w-0 items-center gap-3.5">
        <PersonThumb person={gap.person} familyId={familyId} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm text-foreground/60">{name}</span>
          <span className="font-heading text-lg leading-snug transition-colors duration-base ease-(--ease-reveal) group-hover/tile:text-primary">
            {question}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="relative z-10 -my-1 -ml-2 self-start rounded-full px-2 py-1 text-xs text-foreground/45 transition-colors duration-base ease-(--ease-reveal) hover:bg-glass-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("gapUnknown")}
        <span className="sr-only">: {name}</span>
      </button>
    </li>
  );
}
