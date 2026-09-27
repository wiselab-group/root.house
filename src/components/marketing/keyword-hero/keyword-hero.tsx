"use client";

import { useTranslations } from "next-intl";
import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui/link-button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrollProgress } from "@/components/marketing/shared/use-scroll-progress";
import { keywordPosition } from "@/components/marketing/shared/scroll-math";
import { HERO_KEYWORDS } from "./hero-keywords.data";
import { KeywordWheel } from "./keyword-wheel";
import { HeroTreeVignette } from "./hero-tree-vignette";

function rise(delayMs: number): CSSProperties {
  return { "--rise-delay": `${delayMs}ms` } as CSSProperties;
}

/**
 * "Create the living story of ___": a tall wrapper with a sticky viewport;
 * scrolling through it rolls the heading's last words from one family
 * memory to the next and lights the matching people in the small tree,
 * ending on "your family". The CTAs never depend on scrolling. `.intro-rise`
 * is the first-visit entrance (marketing.css) — inert on return visits.
 * Reduced motion: no tall wrapper, the heading rests on its final words.
 */
export function KeywordHero() {
  const t = useTranslations("landing");
  const wrapperRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  const lastIndex = HERO_KEYWORDS.length - 1;
  const position = prefersReducedMotion
    ? lastIndex
    : keywordPosition(progress, HERO_KEYWORDS.length);

  return (
    <section
      ref={wrapperRef}
      aria-labelledby="hero-title"
      className={cn("relative", !prefersReducedMotion && "h-[240svh]")}
    >
      <div className="sticky top-0 flex min-h-svh items-center overflow-hidden px-6 py-12">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
          <div className="flex flex-col gap-5 sm:gap-6">
            <p className="intro-rise text-xs font-medium tracking-[0.14em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h1
              id="hero-title"
              className="intro-rise font-heading text-hero font-medium"
              style={rise(80)}
            >
              <span className="block">{t("heroLine1")}</span>
              <span className="block">{t("heroLine2")}</span>
              <KeywordWheel position={position} />
            </h1>
            <p
              className="intro-rise max-w-md text-balance text-muted-foreground sm:text-lg"
              style={rise(200)}
            >
              {t("heroLead")}
            </p>
            <div className="intro-rise flex flex-wrap gap-3" style={rise(280)}>
              <LinkButton href="/register" size="lg">
                {t("ctaButton")}
              </LinkButton>
              <LinkButton href="#how-it-works" variant="ghost" size="lg">
                {t("howItWorks")}
              </LinkButton>
            </div>
          </div>
          <HeroTreeVignette
            activeIndex={Math.round(position)}
            className="intro-rise"
            style={rise(360)}
          />
        </div>
        {!prefersReducedMotion && (
          <span
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 sm:flex flex-col items-center gap-2 text-xs tracking-[0.14em] text-muted-foreground uppercase transition-opacity duration-slow"
            style={{ opacity: progress < 0.04 ? 1 : 0 }}
          >
            {t("scroll")}
            <span className="relative h-10 w-px overflow-hidden bg-border">
              <span className="scroll-hint-runner absolute inset-x-0 top-0 h-1/2 bg-foreground" />
            </span>
          </span>
        )}
      </div>
    </section>
  );
}
