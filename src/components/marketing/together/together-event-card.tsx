import { useTranslations } from "next-intl";
import { ImageIcon, MapPin } from "lucide-react";
import { PortraitSilhouette } from "@/components/marketing/shared/portrait-silhouette";
import { delay } from "@/components/marketing/shared/delay";
import { stepAt } from "./together-steps";

/**
 * The wedding as relatives fill it in: an empty photo slot that gets a
 * print and then tags, a year that gets corrected, a remembered line.
 * Decorative — the feed beside it carries the same steps as text.
 */
export function TogetherEventCard() {
  const t = useTranslations("landing.together");
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="relative grid aspect-[16/10] overflow-hidden rounded-2xl">
        <span className="col-start-1 row-start-1 flex items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
          <ImageIcon className="size-6" strokeWidth={1.5} />
        </span>
        <span
          data-reveal="scale"
          className="col-start-1 row-start-1 flex items-end justify-center gap-0 bg-paper-ink/80"
          style={delay(stepAt("lily"))}
        >
          <PortraitSilhouette className="-mr-[6%] w-[34%] text-paper/35" />
          <PortraitSilhouette className="w-[30%] text-paper/50" />
        </span>
        <span className="absolute bottom-3 left-3 flex gap-1.5">
          {t("tagged")
            .split(", ")
            .map((name, index) => (
              <span
                key={name}
                data-reveal=""
                className="rounded-full border border-glass-edge bg-glass-strong px-2.5 py-1 text-xs text-foreground backdrop-blur-md"
                style={delay(stepAt("owen") + index * 150)}
              >
                {name}
              </span>
            ))}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-1">
        <span className="text-xs tracking-[0.14em] text-primary uppercase">
          {t("eventEyebrow")}
        </span>
        <span className="font-heading text-xl font-medium sm:text-2xl">
          {t("eventTitle")}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" /> {t("eventPlace")} ·
          <span className="inline-grid">
            <span
              data-reveal-out=""
              className="col-start-1 row-start-1 line-through"
              style={delay(stepAt("paul"))}
            >
              {t("eventYearWrong")}
            </span>
            <span
              data-reveal=""
              className="col-start-1 row-start-1 text-foreground"
              style={delay(stepAt("paul") + 200)}
            >
              {t("eventYear")}
            </span>
          </span>
        </span>
        <span
          data-reveal=""
          className="mt-2 font-heading text-lg leading-snug italic"
          style={delay(stepAt("margaret"))}
        >
          {t("quote")}
        </span>
      </div>
    </div>
  );
}
