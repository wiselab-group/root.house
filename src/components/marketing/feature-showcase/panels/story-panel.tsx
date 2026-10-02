import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import { PanelFrame } from "./panel-frame";
import { StoryPageHero } from "./story-page/story-page-hero";
import { StoryPageArticle } from "./story-page/story-page-article";

/** The story page at a real desktop width, 4:3 like the panel: the hero
 *  (580px) and the start of the article under it. */
const WIDTH = 1040;
const HEIGHT = 780;
const HERO_HEIGHT = 580;

/**
 * A family story page as the app draws it (stories/[storySlug]: StoryHero
 * + StoryArticle) — the same glass pills, chip, meta line, «Слушать», film
 * strip and article blocks, built from the app's own classes and
 * `stories.*` labels, filled with the landing's fictional family, scaled
 * down as a whole so every size and gap is the app's own.
 */
export function StoryPanel() {
  return (
    <PanelFrame className="bg-background p-0">
      <ScaledCanvas width={WIDTH} height={HEIGHT}>
        <StoryPageHero />
        <StoryPageArticle height={HEIGHT - HERO_HEIGHT} />
      </ScaledCanvas>
    </PanelFrame>
  );
}
