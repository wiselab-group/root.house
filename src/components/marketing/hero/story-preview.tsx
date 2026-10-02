import { useTranslations } from "next-intl";
import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import { StoryPreviewHero } from "./story-preview-hero";
import { StoryPreviewArticle } from "./story-preview-article";

/** The story page is laid out at a real desktop width and scaled down as
 *  a whole, so every size, gap and font is the app's own. */
const CANVAS_WIDTH = 1040;
const CANVAS_HEIGHT = 1000;

/**
 * A family story page as the app draws it (stories/[storySlug]: StoryHero
 * + StoryArticle), in a browser frame — the same glass pills, chip, meta
 * line, «Слушать», film strip and article blocks, built from the app's own
 * classes and `stories.*` labels, filled with the landing's fictional
 * family. The frame keeps the canvas's aspect ratio before any script
 * runs, so nothing shifts while the scale is measured.
 */
export function StoryPreview() {
  const t = useTranslations("landing.hero");
  return (
    <figure
      role="img"
      aria-label={t("visualLabel")}
      className="overflow-hidden rounded-[1.25rem] border border-border bg-background shadow-2xl"
    >
      <div
        aria-hidden="true"
        className="flex h-8 items-center gap-1.5 border-b border-border bg-card px-3.5"
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-2.5 rounded-full bg-muted-foreground/25"
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="relative w-full"
        style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      >
        <ScaledCanvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
          <StoryPreviewHero />
          <StoryPreviewArticle />
        </ScaledCanvas>
      </div>
    </figure>
  );
}
