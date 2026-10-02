import Image from "next/image";
import { HERO_ERAS, eraIndexAt } from "./hero-years.data";

/**
 * The era's photo behind the hero, full-bleed, darkened to sepia. Crossfades
 * as the years pass, the new one settling from a slight zoom;
 * .hero-years-scrim darkens it under the copy and the date line.
 */
export function HeroPhotos({ year }: { year: number }) {
  const current = eraIndexAt(year);
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      {HERO_ERAS.map(({ photo }, index) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt=""
          fill
          sizes="100vw"
          priority={index === 0}
          data-on={index === current}
          className="hero-years-photo object-cover"
        />
      ))}
      <div className="hero-years-scrim absolute inset-0" />
    </div>
  );
}
