import type { CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import { PanelFrame } from "./panel-frame";
import { PhotoLightboxStrip, PhotoLightboxTopBar } from "./photo-lightbox-bars";

/** The lightbox at a real desktop size, 4:3 like the panel. */
const WIDTH = 1040;
const HEIGHT = 780;
/** The photo as LightboxSlide fits it: the room between the 64px top bar
 *  and the 72px strip, less the chevrons' side room. */
const PHOTO_WIDTH = 864;
const PHOTO_HEIGHT = Math.round(
  (PHOTO_WIDTH * LANDING_PHOTOS.grandmother.height) /
    LANDING_PHOTOS.grandmother.width,
);

/** Tagged faces, % of the photo, left to right — the strip's order. The
 *  great-grandmother's is the one lit. */
const TAGS = [
  { x: 45.5, y: 56 },
  { x: 51, y: 46 },
  { x: 57.5, y: 27 },
  { x: 60, y: 42 },
] as const;
const LIT = 1;

/** PhotoTagSpotlight's size cap: 45% of the way to the nearest other tag,
 *  so in a row of small faces the light frames one face, not three. */
function spotCap(index: number): string {
  const { x, y } = TAGS[index];
  const distances = TAGS.filter((_, i) => i !== index).map(
    (other) => `hypot(${other.x - x} * 1cqw, ${other.y - y} * 1cqh)`,
  );
  return `max(3cqmin, min(${distances.join(", ")}) * 0.45)`;
}

/**
 * The family photo viewer as the app draws it (photo-lightbox.tsx, the C2
 * design): the photo's blurred glow behind, the top bar, the photo itself
 * and the strip of who's on it — one name hovered, so the photo dims
 * everywhere but that face (the app's own .photo-tag-spotlight). Scaled
 * down as a whole, so every size and gap is the app's.
 */
export function PhotoPanel() {
  const t = useTranslations("landing");
  const family = useDemoFamily();
  const names = [
    family.margaret.name,
    t("panel.annaName"),
    family.vera.name,
    family.paul.name,
  ];
  const { src } = LANDING_PHOTOS.grandmother;
  return (
    <PanelFrame className="bg-background p-0">
      <ScaledCanvas width={WIDTH} height={HEIGHT}>
        <div className="absolute inset-[-10%] scale-110 opacity-40 blur-3xl saturate-125">
          <Image src={src} alt="" fill sizes="64px" className="object-cover" />
        </div>
        <div className="absolute inset-0 bg-radial-[at_50%_45%] from-background/30 to-background/95 to-80%" />
        <div className="relative flex size-full flex-col">
          <PhotoLightboxTopBar
            index={3}
            total={24}
            caption={t("storyPage.captions.family")}
          />
          <div className="flex min-h-0 flex-1 items-center justify-center py-1">
            <div
              className="relative [container-type:size]"
              style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 1024px) 560px, 90vw"
                className="rounded-xl object-cover"
              />
              <div
                className="photo-tag-spotlight absolute inset-0 rounded-xl bg-background/65"
                style={
                  {
                    "--spot-x": `${TAGS[LIT].x}%`,
                    "--spot-y": `${TAGS[LIT].y}%`,
                    "--spot-cap": spotCap(LIT),
                  } as CSSProperties
                }
              />
            </div>
          </div>
          <PhotoLightboxStrip
            photoCount={24}
            names={names}
            lit={LIT}
            more={3}
          />
        </div>
      </ScaledCanvas>
    </PanelFrame>
  );
}
