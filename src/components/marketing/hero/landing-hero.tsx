import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { HeroYears } from "./hero-years";

/**
 * 01 — What is it, and what's in it for me? The brand's promise as the
 * headline over a hundred years of one (fictional) family: the era's photo
 * behind it, the year beside it — large but thin, under the headline's
 * weight — with the year's event, and the decades along a range at the
 * foot. The years say "generations"; the headline stays what's read first.
 */
export function LandingHero() {
  const t = useTranslations("landing");
  return (
    <HeroYears>
      <div className="flex max-w-xl flex-col gap-4.5">
        <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">
          {t("hero.eyebrow")}
        </p>
        <h1
          id="hero-title"
          className="font-heading text-hero font-medium tracking-[-0.015em] text-balance"
        >
          {t("brandStatement")}
        </h1>
        <p className="max-w-[50ch] text-pretty text-muted-foreground sm:text-lg">
          {t("hero.lead")}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <LinkButton href="/register" size="lg">
            {t("ctaButton")}
          </LinkButton>
          <LinkButton href="#how-it-works" variant="outline" size="lg">
            {t("howItWorks")}
          </LinkButton>
        </div>
      </div>
    </HeroYears>
  );
}
