import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "./hero-slides.data";

/** One card in the scroll-driven stack — transform/opacity only (hardware-
 *  accel rule), values computed by the parent from scroll progress. */
export function HeroStackCard({
  slide,
  slideNumber,
  totalSlides,
  scale,
  opacity,
  translateY,
  zIndex,
  absolute = true,
}: {
  slide: HeroSlide;
  slideNumber: number;
  totalSlides: number;
  scale: number;
  opacity: number;
  translateY: number;
  zIndex: number;
  /** false for the static (reduced-motion) layout, which flows normally
   *  instead of overlapping via absolute positioning. */
  absolute?: boolean;
}) {
  const { Mockup } = slide;
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${slideNumber} of ${totalSlides}: ${slide.eyebrow}`}
      aria-hidden={opacity < 0.5}
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        zIndex,
      }}
      className={cn(
        "mx-auto flex w-[92vw] max-w-3xl flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-lg transition-[transform,opacity] duration-100 ease-out will-change-transform sm:flex-row sm:items-center sm:gap-10 sm:p-10",
        absolute && "absolute inset-x-0 top-0",
        opacity < 1 && "pointer-events-none",
      )}
    >
      <div className="flex flex-1 flex-col gap-3">
        <span className="text-xs font-medium tracking-[0.14em] text-primary">
          {slide.index} · {slide.eyebrow}
        </span>
        <h3 className="font-heading text-2xl font-medium text-balance">
          {slide.title}
        </h3>
        <p className="text-balance text-muted-foreground">{slide.body}</p>
        <LinkButton href={slide.href} className="mt-2 w-fit">
          {slide.ctaLabel} →
        </LinkButton>
      </div>
      <div className="w-full flex-1 sm:max-w-xs">
        <Mockup />
      </div>
    </div>
  );
}
