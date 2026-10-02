"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui/link-button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrollProgress } from "@/components/marketing/shared/use-scroll-progress";
import { stepPosition } from "@/components/marketing/shared/scroll-math";
import { GROWTH_STEPS } from "./growth.data";
import { GrowthStage } from "./growth-stage";

/**
 * 06 — What does it become? Not a giant empty tree to fill in: one person,
 * then parents, grandparents, relatives, children, and finally what's
 * remembered about them — scrolled through step by step. Every step is
 * also listed as text. Reduced motion: no tall wrapper, the finished tree.
 */
export function GrowthSection() {
  const t = useTranslations("landing");
  const wrapperRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  const last = GROWTH_STEPS.length - 1;
  const position = prefersReducedMotion
    ? last
    : stepPosition(progress, GROWTH_STEPS.length);
  const current = Math.round(position);

  return (
    <section
      id="one-person"
      ref={wrapperRef}
      aria-labelledby="growth-title"
      className={cn(
        "relative",
        prefersReducedMotion ? "py-section" : "h-[340svh]",
      )}
    >
      <div
        className={cn(
          "flex items-center px-4 sm:px-6",
          !prefersReducedMotion && "sticky top-0 h-svh overflow-hidden",
        )}
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-5 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="flex flex-col gap-4 lg:gap-8">
            <div className="flex flex-col gap-3">
              <h2
                id="growth-title"
                className="font-heading text-title font-medium text-balance"
              >
                {t("growth.title")}
              </h2>
              <p className="text-balance text-muted-foreground max-lg:hidden sm:text-lg">
                {t("growth.lead")}
              </p>
            </div>
            <ol className="flex flex-col gap-1 max-lg:sr-only">
              {GROWTH_STEPS.map((step, index) => (
                <li
                  key={step}
                  aria-current={index === current ? "step" : undefined}
                  className={cn(
                    "flex gap-4 border-l-2 py-1.5 pl-4 transition-colors duration-slow ease-(--ease-reveal)",
                    index === current ? "border-primary" : "border-border",
                  )}
                >
                  <span className="flex flex-col">
                    <span
                      className={cn(
                        "font-heading text-lg transition-colors duration-slow",
                        index <= current
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {t(`growth.steps.${step}.title`)}
                    </span>
                    {index === current && (
                      <span className="animate-content-enter text-sm text-muted-foreground">
                        {t(`growth.steps.${step}.body`)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p
              aria-hidden="true"
              className="min-h-[3lh] text-muted-foreground lg:hidden"
            >
              <span className="font-medium text-foreground">
                {t(`growth.steps.${GROWTH_STEPS[current]}.title`)}.
              </span>{" "}
              {t(`growth.steps.${GROWTH_STEPS[current]}.body`)}
            </p>
            <LinkButton
              href="/register"
              size="lg"
              className="w-fit max-lg:order-last"
            >
              {t("ctaButton")}
            </LinkButton>
          </div>
          <div className="mx-auto w-[min(100%,calc(100svh-19rem))] lg:w-[min(100%,calc(100svh-8rem))]">
            <GrowthStage position={position} />
          </div>
        </div>
      </div>
    </section>
  );
}
