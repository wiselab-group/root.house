import { useTranslations } from "next-intl";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { Reveal } from "@/components/marketing/shared/reveal";
import { delay } from "@/components/marketing/shared/delay";
import { TogetherEventCard } from "./together-event-card";
import { TogetherFeed } from "./together-feed";

const CLOSING = ["closing1", "closing2", "closing3", "closing4"] as const;

/**
 * 03 — Why involve my family? One event filling in as four relatives each
 * add what they remember, with the family feed beside it saying who did
 * what (the app's real activity log — not live co-editing). The point is
 * made in words at the end.
 */
export function TogetherSection() {
  const t = useTranslations("landing.together");
  return (
    <section
      aria-labelledby="together-title"
      className="px-4 py-section sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:gap-16">
        <MarketingSectionHeading
          id="together-title"
          title={t("title")}
          subcopy={t("lead")}
        />
        <Reveal className="grid items-start gap-6 md:grid-cols-[1.2fr_1fr] md:gap-8 lg:mx-auto lg:max-w-4xl">
          <TogetherEventCard />
          <TogetherFeed />
        </Reveal>
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="font-heading text-heading font-medium text-balance">
            {CLOSING.map((key, index) => (
              <span
                key={key}
                data-reveal=""
                className={
                  index === CLOSING.length - 1
                    ? "mt-2 block text-foreground"
                    : "block text-muted-foreground"
                }
                style={delay(index * 220)}
              >
                {t(key)}
              </span>
            ))}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
