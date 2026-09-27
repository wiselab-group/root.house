import type { ComponentType } from "react";
import { TreePanel } from "./panels/tree-panel";
import { ProfilePanel } from "./panels/profile-panel";
import { PhotoPanel } from "./panels/photo-panel";
import { LifelinePanel } from "./panels/lifeline-panel";
import { StoryPanel } from "./panels/story-panel";
import { KinshipPanel } from "./panels/kinship-panel";

export type ShowcaseFeature = {
  id: string;
  title: string;
  body: string;
  Panel: ComponentType;
};

/** Only what the app really does today — every panel mirrors a shipped
 *  screen (tree, profile hero, lightbox tags, life line, story page, kinship
 *  trace). */
export const SHOWCASE_FEATURES: readonly ShowcaseFeature[] = [
  {
    id: "tree",
    title: "A family tree that grows with you",
    body: "Add people one at a time and the tree lays itself out — couples side by side, children under their parents, every branch where you'd expect it.",
    Panel: TreePanel,
  },
  {
    id: "profile",
    title: "A page for every person",
    body: "Where they were born and lived, what they did, the photos they're in and the stories people tell about them — all on one page.",
    Panel: ProfilePanel,
  },
  {
    id: "photos",
    title: "Photos that know who's in them",
    body: "Tag the people in an old photo and it appears on each of their pages. Hover a face to see who it is.",
    Panel: PhotoPanel,
  },
  {
    id: "lifeline",
    title: "A life on one line",
    body: "Births, moves, weddings and everything in between, laid out on a single line from the first year to the last.",
    Panel: LifelinePanel,
  },
  {
    id: "stories",
    title: "Stories from the ones who remember",
    body: "Write down what grandma told you about the winter of 1947 and link it to everyone who was there.",
    Panel: StoryPanel,
  },
  {
    id: "kinship",
    title: "How exactly are we related?",
    body: "Pick any two people and see the path between them — and what to call each other.",
    Panel: KinshipPanel,
  },
];
