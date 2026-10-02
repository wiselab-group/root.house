import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { StoryPreview } from "./story-preview";

/**
 * 01 — What is it, and what's in it for me? The value in plain words and
 * the first step, readable at once; beside them, one real Root house
 * screen — a family story page — rather than an abstract picture.
 */
export function LandingHero() {
  const t = useTranslations("landing");
  return (
    <section
      aria-labelledby="hero-title"
      className="px-4 pt-28 pb-section sm:px-6 lg:flex lg:min-h-svh lg:items-center lg:pt-24"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">
            {t("hero.eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="font-heading text-display font-medium text-balance"
          >
            {t("hero.title")}
          </h1>
          <p className="max-w-lg text-balance text-muted-foreground sm:text-lg">
            {t("hero.lead")}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-col gap-3">
          <StoryPreview />
          <p className="text-center text-xs text-muted-foreground">
            {t("demoNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
