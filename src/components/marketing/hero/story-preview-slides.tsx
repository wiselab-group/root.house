import type { CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  LANDING_PHOTOS,
  type LandingPhoto,
} from "@/components/marketing/shared/landing-photos";

type Slide = {
  id: "dance" | "wedding" | "family";
  photo: LandingPhoto;
};

/** The story's photos in slideshow order — all landscape, so each fills
 *  the hero the way a wide photo does in the app. */
const SLIDES: readonly Slide[] = [
  { id: "dance", photo: LANDING_PHOTOS.ballroom },
  { id: "wedding", photo: LANDING_PHOTOS.weddingParty },
  { id: "family", photo: LANDING_PHOTOS.grandmother },
];

/** The app's rule (build-story-slides.ts): clearly landscape fills the
 *  hero; anything squarer dissolves in from the right. */
function isWide({ width, height }: LandingPhoto): boolean {
  return width > height * 1.15;
}

/** Film strip thumbnails are 56px tall at the photo's own width
 *  (film-thumb-size.ts). */
function thumbWidth({ width, height }: LandingPhoto): number {
  return Math.round((56 * width) / height);
}

const CYCLE_S = 18;
const TURN_S = CYCLE_S / SLIDES.length;

/** One slide's place in marketing.css's 18s cycle, as a negative delay:
 *  slide N starts already N turns from its own moment, so every slide is
 *  in its right phase from the first frame (a positive delay would hold
 *  the animation's first, visible keyframe until then). */
function turn(index: number): CSSProperties {
  const offset = index === 0 ? 0 : index * TURN_S - CYCLE_S;
  return { "--slide": `${offset}s` } as CSSProperties;
}

/**
 * StoryCarousel's slides — wide photos full-bleed under the scrim, the
 * rest in the right 55% through .hero-photo-mask, all in the print tone —
 * taking turns on their own (opacity/transform only; marketing.css
 * .story-preview-slide). Reduced motion: the first photo, still.
 */
export function StoryPreviewSlides() {
  return (
    <>
      {SLIDES.map(({ id, photo }, index) => {
        const wide = isWide(photo);
        return (
          <div
            key={id}
            className="story-preview-slide absolute inset-0 bg-background"
            style={turn(index)}
          >
            <div
              className={
                wide
                  ? "photo-tone absolute inset-0"
                  : "hero-photo-mask absolute inset-y-0 right-0 w-[55%]"
              }
            >
              <Image
                src={photo.src}
                alt=""
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 560px, 100vw"
                className={`story-preview-drift object-cover ${wide ? "object-[50%_40%]" : "object-[50%_20%]"}`}
                style={turn(index)}
              />
            </div>
            {wide && (
              <div className="hero-scrim pointer-events-none absolute inset-0" />
            )}
          </div>
        );
      })}
    </>
  );
}

/** CarouselFilm's strip: thumbnails at their own widths, the current one
 *  ringed and at full strength, its caption underneath. */
export function StoryPreviewFilm() {
  const t = useTranslations("landing.hero.preview.captions");
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
      <div className="flex justify-center gap-1.5 p-1">
        {SLIDES.map(({ id, photo }, index) => (
          <span
            key={id}
            className="story-preview-thumb photo-tone relative h-14 shrink-0 overflow-hidden rounded-md bg-muted"
            style={{ width: thumbWidth(photo), ...turn(index) }}
          >
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          </span>
        ))}
      </div>
      <p className="relative h-5 w-full text-center text-xs leading-5 text-foreground/65">
        {SLIDES.map(({ id }, index) => (
          <span
            key={id}
            className="story-preview-caption absolute inset-0 truncate"
            style={turn(index)}
          >
            {t(id)}
          </span>
        ))}
      </p>
    </div>
  );
}
