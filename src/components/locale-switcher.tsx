"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/actions/locale.actions";
import { LOCALES } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Short uppercase codes read as a language switch in both languages;
 *  the full name is the accessible label and tooltip. */
const SHORT_LABEL = { ru: "RU", en: "EN" } as const;

/**
 * Two-segment RU/EN toggle. The choice is saved server-side (cookie, plus
 * `users.locale` when signed in), then `router.refresh()` re-renders the
 * server tree in the new language without a full reload or URL change.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("locale");
  const current = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("label")}
      aria-busy={isPending}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border border-border p-0.5 transition-opacity duration-fast",
        isPending && "opacity-60",
        className,
      )}
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            title={t(locale)}
            aria-label={t(locale)}
            aria-pressed={active}
            disabled={isPending}
            onClick={() => {
              if (active) return;
              startTransition(async () => {
                await setLocaleAction(locale);
                router.refresh();
              });
            }}
            className={cn(
              "h-8 min-w-9 cursor-pointer rounded-md px-2 text-xs font-medium tracking-wide outline-none transition-colors duration-fast ease-(--ease-transition) focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-default",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {SHORT_LABEL[locale]}
          </button>
        );
      })}
    </div>
  );
}
