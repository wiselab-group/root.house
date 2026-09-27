import { useTranslations } from "next-intl";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { ChevronLeft, MapPin, Pencil, Share2 } from "lucide-react";
import { PortraitSilhouette } from "@/components/marketing/shared/portrait-silhouette";
import { GlassPill, PanelFrame } from "./panel-frame";

const TABS = ["tabOverview", "tabLifeline", "tabPhotos", "tabStories"] as const;

/** Person profile hero in the app's dark archive style: glass pills,
 *  portrait dissolving into the page, serif name, meta line, tabs. */
export function ProfilePanel() {
  const t = useTranslations("landing");
  const family = useDemoFamily();
  return (
    <PanelFrame className="flex flex-col p-0">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 right-0 flex w-[55%] items-end justify-center bg-secondary [mask-image:linear-gradient(to_left,black_45%,transparent),linear-gradient(to_top,transparent,black_30%)] [mask-composite:intersect]">
          <PortraitSilhouette className="w-[80%] text-muted-foreground/50" />
        </div>
        <div className="relative flex h-full flex-col justify-between p-[6%]">
          <div className="flex gap-2">
            <GlassPill>
              <ChevronLeft className="size-[1.1em]" /> {t("panel.back")}
            </GlassPill>
            <GlassPill>
              <Pencil className="size-[1em]" /> {t("panel.edit")}
            </GlassPill>
            <GlassPill>
              <Share2 className="size-[1em]" /> {t("panel.share")}
            </GlassPill>
          </div>
          <div className="flex max-w-[60%] flex-col gap-[0.4em]">
            <GlassPill className="w-fit">{t("panel.veraRole")}</GlassPill>
            <p className="font-heading text-[clamp(1.25rem,0.6rem+4cqw,2.5rem)] leading-tight font-medium">
              {family.vera.name}
            </p>
            <p className="flex items-center gap-1.5 text-[clamp(0.6875rem,0.5rem+1cqw,0.9375rem)] text-muted-foreground">
              1931 – 2014 <span aria-hidden>·</span>
              <MapPin className="size-[1em]" /> {t("panel.riga")}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-[5%] border-t border-border px-[6%] text-[clamp(0.6875rem,0.5rem+1cqw,0.9375rem)]">
        {TABS.map((tab, index) => (
          <span
            key={tab}
            className={
              index === 0
                ? "border-b-2 border-primary py-[3%] text-foreground"
                : "py-[3%] text-muted-foreground"
            }
          >
            {t(`panel.${tab}`)}
          </span>
        ))}
      </div>
    </PanelFrame>
  );
}
