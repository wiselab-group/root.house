import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, BookOpen, Images, type LucideIcon } from "lucide-react";
import type { GreetingNote } from "./greeting-note";

const LINK =
  "inline-flex items-center gap-1.5 rounded-sm text-foreground decoration-primary/40 underline-offset-4 transition-colors duration-fast ease-(--ease-reveal) hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** The part of FamilyHomeGreeting after «·» — words for a GreetingNote.
 *  Names and counts are the links; the lead words stay quiet. */
export function GreetingNoteView({
  note,
  familySlug,
}: {
  note: GreetingNote;
  familySlug: string;
}) {
  const t = useTranslations("familyHome");
  const tc = useTranslations("counts");

  if (note.kind === "anniversary") {
    const { anniversary, names, years, href, more } = note;
    const lead =
      anniversary === "birth"
        ? t("todayBirth", { years: years ?? 0 })
        : t(
            anniversary === "birthday"
              ? "todayBirthday"
              : anniversary === "wedding"
                ? "todayWedding"
                : "todayMemory",
          );
    return (
      <Words>
        {lead} —{/* The comma hugs the name: outside the flex gap. */}
        <span>
          <Link href={href} className={LINK}>
            {names.join(` ${t("and")} `)}
          </Link>
          {anniversary !== "birth" &&
            years !== null &&
            `, ${t("yearsSuffix", { years })}`}
        </span>
        {more > 0 && <span>{t("andMore", { count: more })}</span>}
      </Words>
    );
  }

  if (note.kind === "draft") {
    return (
      <Words>
        {note.title
          ? t("draftWaiting", { title: note.title })
          : t("draftWaitingUntitled")}
        <span aria-hidden="true">—</span>
        <Link href={note.href} className={LINK}>
          {t("draftContinue")}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </Words>
    );
  }

  const added: { href: string; Icon: LucideIcon; label: string }[] = [];
  if (note.photos > 0)
    added.push({
      href: `/families/${familySlug}/photos`,
      Icon: Images,
      label: tc("photos", { count: note.photos }),
    });
  if (note.stories > 0)
    added.push({
      href: `/families/${familySlug}/stories`,
      Icon: BookOpen,
      label: tc("stories", { count: note.stories }),
    });
  return (
    <Words>
      {t("weekAdded")}
      {added.map(({ href, Icon, label }, index) => (
        <Fragment key={href}>
          {index > 0 && <span>{t("and")}</span>}
          <Link href={href} className={LINK}>
            <Icon
              className="size-4 shrink-0 text-tree-accent"
              aria-hidden="true"
            />
            {label}
          </Link>
        </Fragment>
      ))}
    </Words>
  );
}

function Words({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {children}
    </span>
  );
}
