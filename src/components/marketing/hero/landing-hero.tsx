import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { HeroStoryVisual } from "./hero-story-visual";

/**
 * 01 — What is Root house? The promise and the first step are readable
 * immediately (no intro, no scroll needed); the picture beside them is one
 * family's story assembling itself — people, a photo, a place, a story,
 * and relatives adding to it.
 */
export function LandingHero() {
  const t = useTranslations("landing");
  return (
    <section
      aria-labelledby="hero-title"
      className="px-4 pt-28 pb-section sm:px-6 lg:flex lg:min-h-svh lg:items-center lg:pt-24"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">
            {t("hero.eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="font-heading text-hero font-medium text-balance"
          >
            {t("hero.title")}
          </h1>
          <p className="max-w-lg text-balance text-muted-foreground sm:text-lg">
            {t("hero.lead")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <LinkButton href="/register" size="lg">
              {t("ctaButton")}
            </LinkButton>
            <LinkButton href="#how-it-works" variant="ghost" size="lg">
              {t("howItWorks")}
            </LinkButton>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <HeroStoryVisual />
          <p className="text-center text-xs text-muted-foreground">
            {t("demoNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
