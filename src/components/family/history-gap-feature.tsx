import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { PersonThumb } from "@/components/person/person-thumb";
import { useGapWording, type HistoryGapItem } from "./history-gap-wording";

/** The day's lead question — a large portrait, the question itself in the
 *  heading face, and the two answers: «Дополнить» (terracotta, the one
 *  action) or «Мы не знаем». */
export function HistoryGapFeature({
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
    <div className="animate-content-enter flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <PersonThumb person={gap.person} familyId={familyId} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm text-foreground/60">{name}</span>
          <p className="font-heading text-2xl leading-snug font-medium tracking-tight text-balance sm:text-[1.75rem]">
            {question}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
        <Link
          href={href}
          className="group flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,scale] duration-base ease-(--ease-tree-focus) hover:bg-primary/90 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("gapAnswer")}
          <span className="sr-only">: {name}</span>
          <ArrowRight
            className="size-4 transition-transform duration-base ease-(--ease-tree-focus) group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 rounded-full px-4 text-sm text-foreground/60 transition-colors duration-base ease-(--ease-reveal) hover:bg-glass-strong hover:text-foreground active:bg-glass-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("gapUnknown")}
          <span className="sr-only">: {name}</span>
        </button>
      </div>
    </div>
  );
}
