import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";

/**
 * 01 — What is it, and what's in it for me? The brand's promise as the
 * headline, what's inside in one line, and the first step — readable at
 * once, nothing to wait for. What it looks like comes right after (the
 * story page lives in «Возможности» → «Истории»).
 */
export function LandingHero() {
  const t = useTranslations("landing");
  return (
    <section
      aria-labelledby="hero-title"
      className="flex min-h-[88svh] items-center px-4 pt-28 pb-section sm:px-6 lg:pt-24"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">
          {t("hero.eyebrow")}
        </p>
        <h1
          id="hero-title"
          className="font-heading text-hero font-medium text-balance"
        >
          {t("brandStatement")}
        </h1>
        <p className="max-w-2xl text-balance text-muted-foreground sm:text-lg">
          {t("hero.lead")}
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="flex flex-wrap justify-center gap-3">
            <LinkButton href="/register" size="lg">
              {t("ctaButton")}
            </LinkButton>
            <LinkButton href="#how-it-works" variant="ghost" size="lg">
              {t("howItWorks")}
            </LinkButton>
          </div>
          <p className="text-sm text-muted-foreground">{t("ctaNote")}</p>
        </div>
      </div>
    </section>
  );
}
