import type { ComponentType } from "react";
import { TreeMockup } from "@/components/marketing/mockups/tree-mockup";
import { GalleryMockup } from "@/components/marketing/mockups/gallery-mockup";
import { ProfileMockup } from "@/components/marketing/mockups/profile-mockup";

export type HeroSlide = {
  id: "preserve" | "discover" | "together";
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** All three currently route to /register — there's no per-slide
   *  destination in the app, only differing framing. */
  href: "/register";
  Mockup: ComponentType;
};

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: "preserve",
    index: "01",
    eyebrow: "PRESERVE",
    title: "Every memory, kept somewhere real.",
    body: "Add photos, write down the stories only you remember, and build a timeline of the moments that mattered — all attached to the people they belong to, not lost in a camera roll.",
    ctaLabel: "Preserve our story",
    href: "/register",
    Mockup: GalleryMockup,
  },
  {
    id: "discover",
    index: "02",
    eyebrow: "DISCOVER",
    title: "See how everyone connects.",
    body: "An interactive family tree that grows as you add people — parents, grandparents, cousins, the second marriage nobody quite remembers the details of. Pan, zoom, and follow the lines.",
    ctaLabel: "Build our family tree",
    href: "/register",
    Mockup: TreeMockup,
  },
  {
    id: "together",
    index: "03",
    eyebrow: "TOGETHER",
    title: "Your family, not just your account.",
    body: "Invite the people who remember things you don't. Everyone gets their own login, their own role, and the same private family home.",
    ctaLabel: "Invite my family",
    href: "/register",
    Mockup: ProfileMockup,
  },
];
