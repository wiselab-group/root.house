"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { SHOWCASE_FEATURES } from "./features.data";

/**
 * One row of the feature list: a real button with aria-expanded, and when
 * open its text — plus, on phones, its illustration right under it, so
 * switching is seen where the finger is (on desktop the illustration sits
 * beside the list instead). Opening a row lower down collapses the one
 * above and the page shifts up, so a just-opened row whose title went
 * off-screen is scrolled back into view.
 */
export function FeatureShowcaseItem({
  feature,
  index,
  isOpen,
  onOpen,
}: {
  feature: (typeof SHOWCASE_FEATURES)[number];
  index: number;
  isOpen: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations("landing");
  const reduced = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openedByTapRef = useRef(false);
  const { id, Panel } = feature;
  const title = t(`features.${id}.title`);

  useEffect(() => {
    if (!isOpen || !openedByTapRef.current) return;
    openedByTapRef.current = false;
    const button = buttonRef.current;
    // Below the sticky header counts as off-screen too (its scroll padding).
    const covered =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0;
    if (!button || button.getBoundingClientRect().top >= covered) return;
    button.scrollIntoView({
      block: "start",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [isOpen, reduced]);

  return (
    <li>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="showcase-illustration"
        onClick={() => {
          openedByTapRef.current = true;
          onOpen();
        }}
        className="group flex w-full scroll-mt-4 items-baseline gap-4 rounded-md py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "font-heading text-lg transition-colors duration-base ease-(--ease-reveal) sm:text-xl",
            isOpen
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {title}
        </span>
      </button>
      {isOpen && (
        <div className="flex animate-content-enter flex-col gap-4 pb-5">
          <p className="pl-9 text-balance text-muted-foreground">
            {t(`features.${id}.body`)}
          </p>
          <div
            role="img"
            aria-label={title}
            className="relative aspect-4/3 w-full lg:hidden"
          >
            <Panel />
          </div>
        </div>
      )}
    </li>
  );
}
