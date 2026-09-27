"use client";

import { useTranslations } from "next-intl";
import { useEffect, type AnimationEvent, type CSSProperties } from "react";

/** Generations handing the story down until it reaches the visitor — the
 *  last word stays on screen while the panel lifts away. */

type IntroEnd = "ended" | "skipped";

function finishIntro(state: IntroEnd) {
  const root = document.documentElement;
  if (root.dataset.intro === "play") root.dataset.intro = state;
}

/**
 * First-visit intro (Dennis Snellenberg-style words preloader): the words
 * cycle, then the panel lifts off with a curved lower edge that flattens on
 * the way out, uncovering the hero. All timing lives in marketing.css; this
 * component only reports the end (or a skip) back to html[data-intro]. It is
 * always in the DOM but display:none unless intro-script.ts decided this
 * visit plays it. Click or Esc skips.
 */
export function IntroPreloader() {
  const t = useTranslations("landing");
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finishIntro("skipped");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.animationName === "intro-lift") finishIntro("ended");
  }

  return (
    <div
      aria-hidden="true"
      className="intro-overlay fixed inset-0 z-50 cursor-pointer"
      onClick={() => finishIntro("skipped")}
    >
      <div
        className="intro-panel relative h-full bg-background will-change-transform"
        onAnimationEnd={onAnimationEnd}
      >
        <div className="flex h-full items-center justify-center px-6">
          <p className="relative h-[1.2em] w-full font-heading text-display font-medium">
            {t("intro")
              .split("|")
              .map((word, index) => (
                <span
                  key={word}
                  className="intro-word absolute inset-0 flex items-center justify-center gap-[0.35em]"
                  style={{ "--i": index } as CSSProperties}
                >
                  <span className="size-[0.18em] shrink-0 rounded-full bg-primary" />
                  {word}
                </span>
              ))}
          </p>
        </div>
        <div className="intro-curve absolute top-full -left-[10%] h-[14svh] w-[120%] rounded-b-[50%] bg-background" />
      </div>
    </div>
  );
}
