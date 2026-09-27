"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { SHOWCASE_FEATURES } from "./features.data";

/**
 * Apple-style feature block (the user's skiper76 reference): one list item
 * open at a time on one side, its illustration crossfading in on the
 * other. Every panel stays mounted so switching is a pure opacity/transform
 * crossfade; hidden ones are `inert`. The list is real buttons with
 * aria-expanded, so it works from the keyboard like any disclosure.
 */
export function FeatureShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = SHOWCASE_FEATURES[activeIndex];

  return (
    <section aria-labelledby="showcase-title" className="px-6 py-section">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <div className="flex flex-col gap-8">
          <MarketingSectionHeading
            id="showcase-title"
            align="left"
            eyebrow="Inside Root house"
            title="A person is more than a name and two dates."
          />
          <ul className="divide-y divide-border border-y border-border">
            {SHOWCASE_FEATURES.map((feature, index) => {
              const isOpen = index === activeIndex;
              return (
                <li key={feature.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls="showcase-illustration"
                    onClick={() => setActiveIndex(index)}
                    className="group flex w-full items-baseline gap-4 rounded-md py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      {feature.title}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="animate-content-enter pb-5 pl-9 text-balance text-muted-foreground">
                      {feature.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div
          id="showcase-illustration"
          role="img"
          aria-label={active.title}
          className="relative aspect-[4/3] w-full max-lg:order-first"
        >
          {SHOWCASE_FEATURES.map(({ id, Panel }, index) => (
            <div
              key={id}
              inert={index !== activeIndex}
              className={cn(
                "absolute inset-0 transition-[opacity,transform] duration-reveal ease-(--ease-reveal)",
                index === activeIndex
                  ? "opacity-100"
                  : "translate-y-3 scale-[0.98] opacity-0",
              )}
            >
              <Panel />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
