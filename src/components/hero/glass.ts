/**
 * Frosted-glass class sets for controls that float over a photo on the
 * Person Profile and Story pages (reference screenshots: "Назад",
 * "Редактировать", "Поделиться" pills, type chips, the tab bar). Plain
 * strings rather than components so they can be applied to whatever element
 * already owns the behavior — a next/link Link, a base-ui DialogTrigger
 * render prop, a native button — without wrapping each in another layer.
 *
 * Only meaningful inside a `.dark.photo-backdrop` page (globals.css): the
 * --glass* tokens are a translucent tint of that page's own foreground.
 */
export const glassSurface =
  "border border-glass-edge bg-glass backdrop-blur-xl backdrop-saturate-150";

/** Pills sit over the photo itself, where the translucent-light glassSurface
 *  went unreadable on a light studio background (caught on the Купчик-shaped
 *  test data: «Редактировать» over a #dfdfdf wall) — so they tint toward the
 *  page's own dark background instead, like the reference's dark pills. */
const glassOverPhoto =
  "border border-glass-edge bg-background/45 backdrop-blur-xl backdrop-saturate-150";

/** Shared pill behavior WITHOUT size/padding — Tailwind resolves conflicting
 *  utilities by stylesheet order, not class order, so the icon variant can't
 *  "override" px-4/h-10 by appending px-0/size-12 (it lost: a 40px circle
 *  kept 32px of padding and squeezed its icon to 6px wide). */
const glassPillBase = `${glassOverPhoto} inline-flex shrink-0 items-center justify-center rounded-full text-sm font-medium text-foreground transition-[background-color,transform] duration-200 ease-(--ease-reveal) hover:bg-background/70 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`;

export const glassPill = `${glassPillBase} h-10 gap-2 px-4 [&_svg]:size-4`;

/** Icon-only 40px circle. */
export const glassIconButton = `${glassPillBase} size-10 [&_svg]:size-4`;

/** Icon-only 48px circle — the story carousel's slideshow / grid buttons. */
export const glassIconButtonLarge = `${glassPillBase} size-12 [&_svg]:size-5`;

export const glassChip = `${glassOverPhoto} inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs text-foreground [&_svg]:size-3.5`;
