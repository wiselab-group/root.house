"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrollProgress } from "@/components/marketing/shared/use-scroll-progress";
import {
  fragmentProgress,
  gatheredProgress,
} from "@/components/marketing/shared/scroll-math";
import { STORY_FRAGMENTS } from "./fragments.data";
import { FragmentView } from "./fragment-view";
import { GatheredStoryCard } from "./gathered-story-card";

/**
 * 02 — Why do I need it? The family's story lives in phones, chats,
 * albums and people's memories. The screen holds still for under one
 * viewport height of scrolling (a tall wrapper with a sticky viewport),
 * and over exactly that scroll the pieces gather into one family story —
 * scrolling back scatters them again — while the caption turns from the
 * problem to the answer. Reduced motion: no tall wrapper, the pieces stay
 * scattered (the picture of the problem) and both captions are shown.
 */
export function ProblemSection() {
  const t = useTranslations("landing.problem");
  const wrapperRef = useRef<HTMLElement>(null);
  const scrolled = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  const progress = prefersReducedMotion ? 0 : scrolled;
  const gathered = gatheredProgress(progress);

  return (
    <section
      ref={wrapperRef}
      aria-labelledby="problem-title"
      className={cn(
        "relative",
        prefersReducedMotion ? "py-section" : "h-[190svh]",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-6 px-4 sm:gap-8 sm:px-6",
          !prefersReducedMotion &&
            "sticky top-(--marketing-header-h) h-[calc(100svh-var(--marketing-header-h))] overflow-hidden",
        )}
      >
        <h2
          id="problem-title"
          className="text-center font-heading text-title font-medium text-balance"
        >
          {t("title")}
        </h2>
        <div
          aria-hidden="true"
          className="gather-stage relative aspect-100/120 w-[min(100%,calc((100svh-var(--marketing-header-h)-19rem)/1.2))] sm:aspect-16/10 sm:w-[min(100%,calc((100svh-var(--marketing-header-h)-17rem)*1.6))] lg:max-w-5xl"
        >
          {STORY_FRAGMENTS.map((fragment, index) => (
            <FragmentView
              key={fragment.id}
              fragment={fragment}
              t={fragmentProgress(progress, index, STORY_FRAGMENTS.length)}
            />
          ))}
          {!prefersReducedMotion && <GatheredStoryCard shown={gathered} />}
        </div>
        <div
          className={cn(
            "mx-auto max-w-2xl text-center",
            prefersReducedMotion ? "flex flex-col gap-4" : "grid",
          )}
        >
          <p
            className="col-start-1 row-start-1 text-balance text-muted-foreground sm:text-lg"
            style={{ opacity: prefersReducedMotion ? 1 : 1 - gathered }}
          >
            {t("body")}
          </p>
          <p
            className="col-start-1 row-start-1 self-center font-heading text-heading font-medium text-balance"
            style={{ opacity: prefersReducedMotion ? 1 : gathered }}
          >
            {t("answer")}
          </p>
        </div>
      </div>
    </section>
  );
}
