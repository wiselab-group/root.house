import type { ComponentType } from "react";
import { TreePanel } from "./panels/tree-panel";
import { ProfilePanel } from "./panels/profile-panel";
import { PhotoPanel } from "./panels/photo-panel";
import { LifelinePanel } from "./panels/lifeline-panel";
import { StoryPanel } from "./panels/story-panel";
import { KinshipPanel } from "./panels/kinship-panel";

export type ShowcaseFeature = {
  /** Key into `landing.features.*` (title + body). */
  id: "tree" | "profile" | "photos" | "lifeline" | "stories" | "kinship";
  Panel: ComponentType;
};

/** Only what the app really does today — every panel mirrors a shipped
 *  screen (tree, profile hero, lightbox tags, life line, story page, kinship
 *  trace). */
export const SHOWCASE_FEATURES: readonly ShowcaseFeature[] = [
  {
    id: "tree",
    Panel: TreePanel,
  },
  {
    id: "profile",
    Panel: ProfilePanel,
  },
  {
    id: "photos",
    Panel: PhotoPanel,
  },
  {
    id: "lifeline",
    Panel: LifelinePanel,
  },
  {
    id: "stories",
    Panel: StoryPanel,
  },
  {
    id: "kinship",
    Panel: KinshipPanel,
  },
];
