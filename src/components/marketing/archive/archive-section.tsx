import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { Reveal } from "@/components/marketing/shared/reveal";
import { delay } from "@/components/marketing/shared/delay";
import { SoonBadge } from "@/components/marketing/shared/soon-badge";

const ROWS = [
  "people",
  "photos",
  "stories",
  "places",
  "events",
  "voices",
] as const;

/**
 * 08 — What happens to everything I create? It's all kept together, as a
 * family archive's inventory sheet. Exporting it is not built yet — shown
 * as a promise with its badge, never as a working button.
 */
export function ArchiveSection() {
  const t = useTranslations("landing.archive");
  return (
    <section
      aria-labelledby="archive-title"
      className="px-4 py-section sm:px-6"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="flex flex-col gap-8">
          <MarketingSectionHeading
            id="archive-title"
            align="left"
            title={t("title")}
            subcopy={t("lead")}
          />
          <p className="font-heading text-heading font-medium text-balance italic">
            {t("ownership")}
          </p>
        </div>
        <Reveal className="flex flex-col gap-4">
          <div
            data-reveal=""
            className="-rotate-1 rounded-sm bg-paper px-6 py-7 text-paper-ink shadow-xl sm:px-9 sm:py-9"
          >
            <p className="text-xs tracking-[0.18em] uppercase opacity-70">
              {t("sheetEyebrow")}
            </p>
            <h3 className="mt-1 font-heading text-2xl font-medium">
              {t("sheetTitle")}
            </h3>
            <dl className="mt-6 flex flex-col">
              {ROWS.map((row, index) => (
                <div
                  key={row}
                  data-reveal=""
                  className="flex items-baseline gap-3 border-t border-paper-ink/15 py-2.5"
                  style={delay(250 + index * 120)}
                >
                  <dt className="order-2 flex-1 text-paper-ink/80">
                    {t(`rows.${row}.label`)}
                  </dt>
                  <dd className="order-1 w-14 font-heading text-2xl tabular-nums">
                    {t(`rows.${row}.count`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div
            data-reveal=""
            className="flex items-start gap-4 rounded-2xl border border-dashed border-border p-5"
            style={delay(1100)}
          >
            <FileDown
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <div className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {t("exportTitle")} <SoonBadge />
              </span>
              <span className="text-sm text-muted-foreground">
                {t("exportBody")}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
