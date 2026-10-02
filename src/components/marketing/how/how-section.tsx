import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { Reveal } from "@/components/marketing/shared/reveal";
import { delay } from "@/components/marketing/shared/delay";
import { FamilyVisual, MemoriesVisual, PeopleVisual } from "./how-visuals";

const STEPS: readonly {
  id: "people" | "memories" | "family";
  Visual: ComponentType;
}[] = [
  { id: "people", Visual: PeopleVisual },
  { id: "memories", Visual: MemoriesVisual },
  { id: "family", Visual: FamilyVisual },
];

/** 03 — How does it work? Three steps, each with a glimpse of the screen
 *  it happens on. */
export function HowSection() {
  const t = useTranslations("landing.how");
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-8 px-4 py-section sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <MarketingSectionHeading
          id="how-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
        />
        <Reveal threshold={0.2}>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map(({ id, Visual }, index) => (
              <li
                key={id}
                data-reveal=""
                className="flex flex-col gap-5 rounded-3xl border border-border bg-card/60 p-5"
                style={delay(index * 160)}
              >
                <div
                  aria-hidden="true"
                  className="flex h-44 items-center justify-center rounded-2xl bg-background/60 p-4"
                >
                  <Visual />
                </div>
                <div className="flex flex-col gap-1.5 px-1">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-heading text-xl font-medium">
                    {t(`steps.${id}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`steps.${id}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
