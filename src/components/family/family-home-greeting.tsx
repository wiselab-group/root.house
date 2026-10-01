import { useTranslations } from "next-intl";
import type { DayPeriod } from "@/lib/day-period";
import type { GreetingNote } from "./greeting-note";
import { GreetingNoteView } from "./greeting-note-view";

/**
 * The quiet line above Family Home's title (user's pick 2026-10-01, from
 * the start-page mock): «Добрый вечер, Александр · <one personal note>» —
 * a memorable date today, an unfinished draft, or what the family added
 * this week (see greeting-note.ts for the priority). `period` is null until
 * the browser has reported its time zone (TimeZoneCookie), and the
 * greeting is then a neutral «Здравствуйте».
 */
export function FamilyHomeGreeting({
  period,
  firstName,
  note,
  familySlug,
}: {
  period: DayPeriod | null;
  firstName: string | null;
  note: GreetingNote | null;
  familySlug: string;
}) {
  const t = useTranslations("familyHome");
  const greeting = t("greeting", { period: period ?? "unknown" });

  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-foreground/70">
      <span>
        {firstName
          ? t("greetingNamed", { greeting, name: firstName })
          : greeting}
      </span>
      {note && (
        <>
          <span aria-hidden="true" className="text-foreground/40">
            ·
          </span>
          <GreetingNoteView note={note} familySlug={familySlug} />
        </>
      )}
    </p>
  );
}
