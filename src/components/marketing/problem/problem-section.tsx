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
 * 02 — Why do I need it? The story is scattered across phones, chats,
 * albums and people's memories; scrolling gathers the pieces into one
 * family story, and the caption turns from the problem to the answer.
 * Reduced motion: no tall wrapper, the scattered pieces and both captions.
 */
export function ProblemSection() {
  const t = useTranslations("landing.problem");
  const wrapperRef = useRef<HTMLElement>(null);
  const scrollProgress = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  // Reduced motion keeps the pieces scattered — the picture of the
  // problem — and states the answer in words only.
  const progress = prefersReducedMotion ? 0 : scrollProgress;
  const gathered = gatheredProgress(progress);
  const problem = prefersReducedMotion ? 1 : 1 - gathered;
  const answer = prefersReducedMotion ? 1 : gathered;

  return (
    <section
      id="how-it-works"
      ref={wrapperRef}
      aria-labelledby="problem-title"
      className={cn(
        "relative scroll-mt-0",
        prefersReducedMotion ? "py-section" : "h-[230svh]",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-6 px-4 sm:gap-8 sm:px-6",
          !prefersReducedMotion && "sticky top-0 h-svh overflow-hidden",
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
          className="gather-stage relative aspect-[100/120] w-[min(100%,calc((100svh-17rem)/1.2))] sm:aspect-[16/10] sm:w-[min(100%,calc((100svh-16rem)*1.6))] lg:max-w-5xl"
        >
          {STORY_FRAGMENTS.map((fragment, index) => (
            <FragmentView
              key={fragment.id}
              fragment={fragment}
              t={fragmentProgress(progress, index, STORY_FRAGMENTS.length)}
            />
          ))}
          <GatheredStoryCard shown={gathered} />
        </div>
        <div
          className={cn(
            "mx-auto max-w-2xl text-center",
            !prefersReducedMotion && "grid",
          )}
        >
          <p
            className="col-start-1 row-start-1 text-balance text-muted-foreground sm:text-lg"
            style={{ opacity: problem }}
          >
            {t("body")}
          </p>
          <p
            className={cn(
              "col-start-1 row-start-1 self-center font-heading text-heading font-medium text-balance",
              prefersReducedMotion && "mt-4",
            )}
            style={{ opacity: answer }}
          >
            {t("answer")}
          </p>
        </div>
      </div>
    </section>
  );
}
