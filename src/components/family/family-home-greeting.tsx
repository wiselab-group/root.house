import { Fragment } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Images, type LucideIcon } from "lucide-react";
import type { DayPeriod } from "@/lib/day-period";

/**
 * The quiet line above Family Home's title (user's pick 2026-10-01, from
 * the start-page mock): «Добрый вечер, Александр · за неделю добавлено
 * 12 фото и 2 истории». The week part shows only what actually arrived —
 * never «0 фото» — and each count links to its section. `period` is null
 * until the browser has reported its time zone (TimeZoneCookie), and the
 * greeting is then a neutral «Здравствуйте».
 */
export function FamilyHomeGreeting({
  period,
  firstName,
  weekPhotos,
  weekStories,
  familySlug,
}: {
  period: DayPeriod | null;
  firstName: string | null;
  weekPhotos: number;
  weekStories: number;
  familySlug: string;
}) {
  const t = useTranslations("familyHome");
  const tc = useTranslations("counts");
  const greeting = t("greeting", { period: period ?? "unknown" });
  const added: { href: string; Icon: LucideIcon; label: string }[] = [];
  if (weekPhotos > 0)
    added.push({
      href: `/families/${familySlug}/photos`,
      Icon: Images,
      label: tc("photos", { count: weekPhotos }),
    });
  if (weekStories > 0)
    added.push({
      href: `/families/${familySlug}/stories`,
      Icon: BookOpen,
      label: tc("stories", { count: weekStories }),
    });

  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-foreground/70">
      <span>
        {firstName
          ? t("greetingNamed", { greeting, name: firstName })
          : greeting}
      </span>
      {added.length > 0 && (
        <>
          <span aria-hidden="true" className="text-foreground/40">
            ·
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {t("weekAdded")}
            {added.map(({ href, Icon, label }, index) => (
              <Fragment key={href}>
                {index > 0 && <span>{t("and")}</span>}
                <Link
                  href={href}
                  className="flex items-center gap-1.5 rounded-sm text-foreground decoration-primary/40 underline-offset-4 transition-colors duration-fast ease-(--ease-reveal) hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Icon
                    className="size-4 shrink-0 text-tree-accent"
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              </Fragment>
            ))}
          </span>
        </>
      )}
    </p>
  );
}
