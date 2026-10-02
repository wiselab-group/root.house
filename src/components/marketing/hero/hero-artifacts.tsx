import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { PortraitSilhouette } from "@/components/marketing/shared/portrait-silhouette";
import { delay } from "@/components/marketing/shared/delay";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";

const ACTIVITY = [
  { key: "activity1", who: "margaret", at: 2600 },
  { key: "activity2", who: "paul", at: 6100 },
  { key: "activity3", who: "lily", at: 9600 },
] as const;

const SMALL = "text-[clamp(0.625rem,0.4rem+1.1cqw,0.8125rem)]";

/**
 * What the hero family remembers, each pinned beside its people: the 1952
 * print by the grandparents, the move by the parents, Mom's story by you —
 * and, at the bottom, relatives taking turns adding to it. Positions are in
 * the hero stage's cqw (hero-story-visual.tsx).
 */
export function HeroArtifacts() {
  const t = useTranslations("landing.hero");
  const family = useDemoFamily();
  return (
    <>
      <figure
        data-reveal="drop"
        className="absolute top-[3cqw] left-[63%] w-[31%] rotate-3 rounded-[4%] bg-paper p-[2.2cqw] pb-[1.6cqw] shadow-lg"
        style={delay(1300)}
      >
        <div className="flex aspect-[1/0.86] items-end justify-center overflow-hidden rounded-[2%] bg-paper-ink/12">
          <PortraitSilhouette className="-mr-[12%] w-[52%] text-paper-ink/45" />
          <PortraitSilhouette className="w-[46%] text-paper-ink/60" />
        </div>
        <figcaption
          className={`mt-[1.4cqw] truncate font-heading text-paper-ink italic ${SMALL}`}
        >
          {t("photoCaption")}
        </figcaption>
      </figure>

      <span
        data-reveal=""
        className={`absolute top-[44.84cqw] left-[62%] inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-glass-edge bg-glass-strong px-[0.9em] py-[0.4em] whitespace-nowrap text-foreground backdrop-blur-md ${SMALL}`}
        style={delay(1700)}
      >
        <MapPin className="size-[1.1em] text-muted-foreground" />
        {t("place")}
        <span className="text-muted-foreground">· {t("placeYear")}</span>
      </span>

      <article
        data-reveal=""
        className="absolute top-[58cqw] left-[57%] flex w-[41%] flex-col gap-[0.8cqw] rounded-[3cqw] border border-border bg-card p-[3cqw] shadow-sm"
        style={delay(1950)}
      >
        <span className="text-[clamp(0.5625rem,0.35rem+0.9cqw,0.6875rem)] tracking-[0.12em] text-primary uppercase">
          {t("storyEyebrow")}
        </span>
        <span className="font-heading text-[clamp(0.75rem,0.45rem+1.7cqw,1.125rem)] leading-tight font-medium">
          {t("storyTitle")}
        </span>
        <span
          className={`leading-snug text-muted-foreground max-sm:hidden ${SMALL}`}
        >
          {t("storyText")}
        </span>
        <span className={`text-muted-foreground/80 ${SMALL}`}>
          {t("storyMeta")}
        </span>
      </article>

      <div className="absolute top-[97cqw] left-0 w-[56%]">
        {ACTIVITY.map(({ key, who, at }) => (
          <span
            key={key}
            className={`hero-activity absolute top-0 left-0 inline-flex max-w-full items-center gap-2 rounded-full border border-glass-edge bg-glass py-[0.35em] pr-[0.9em] pl-[0.35em] text-foreground ${SMALL}`}
            style={delay(at)}
          >
            <span className="flex size-[1.7em] shrink-0 items-center justify-center rounded-full bg-accent text-[0.85em] font-medium text-accent-foreground">
              {family[who].name[0]}
            </span>
            <span className="truncate">{t(key)}</span>
          </span>
        ))}
      </div>
    </>
  );
}
