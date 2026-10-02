import Image from "next/image";
import { useTranslations } from "next-intl";
import { UserRoundPlus } from "lucide-react";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { GlassPill, PanelFrame } from "./panel-frame";

/** The great-grandmother's face in the 1950 group photo, % of the frame. */
const SPOT = { x: 50.5, y: 45.5 };

/** Lightbox with tagged people: the photo dims except a soft circle around
 *  the hovered face (the app's PhotoTagSpotlight), whose name floats below
 *  it. */
export function PhotoPanel() {
  const t = useTranslations("landing.panel");
  return (
    <PanelFrame className="bg-background p-0">
      <div className="absolute inset-[8%_8%_15%] overflow-hidden rounded-xl bg-secondary">
        <Image
          src={LANDING_PHOTOS.grandmother.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 560px, 90vw"
          className="object-cover sepia-20"
        />
        <div
          className="absolute inset-0 bg-background/65"
          style={{
            maskImage: `radial-gradient(circle at ${SPOT.x}% ${SPOT.y}%, transparent 0, transparent 7%, black 13%)`,
          }}
        />
        <GlassPill
          className="absolute -translate-x-1/2"
          style={{ left: `${SPOT.x}%`, top: `${SPOT.y + 12}%` }}
        >
          {t("annaName")}
        </GlassPill>
      </div>
      <div className="absolute inset-x-[8%] bottom-[3%] flex items-center justify-between gap-3">
        <span className="truncate text-[clamp(0.625rem,0.45rem+0.9cqw,0.8125rem)] text-muted-foreground">
          {t("photoCaption")}
        </span>
        <GlassPill>
          <UserRoundPlus className="size-[1em]" /> {t("tagPeople")}
        </GlassPill>
      </div>
    </PanelFrame>
  );
}
