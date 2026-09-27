import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";

const STEPS = [
  { title: "step1Title", body: "step1Body" },
  { title: "step2Title", body: "step2Body" },
  { title: "step3Title", body: "step3Body" },
  { title: "step4Title", body: "step4Body" },
] as const;

/**
 * "Start with one person" — the lowest possible first step, as a single
 * vertical thread instead of rows of icons. Also carries the old
 * generational-value message (grandparents / parents / you) in its subcopy.
 */
export function StartWithOnePersonSection() {
  const t = useTranslations("landing");
  return (
    <section aria-labelledby="start-title" className="px-6 py-section">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-8">
          <MarketingSectionHeading
            id="start-title"
            align="left"
            eyebrow={t("startEyebrow")}
            title={t("startTitle")}
            subcopy={t("startSubcopy")}
          />
          <LinkButton href="/register" size="lg">
            {t("ctaButton")}
          </LinkButton>
        </div>
        <ol className="relative flex flex-col gap-8 border-l border-border pl-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-1">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-9.25 size-2.5 rounded-full border-[1.5px] border-muted-foreground bg-background"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-heading text-xl">{t(step.title)}</span>
              <span className="text-muted-foreground">{t(step.body)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
