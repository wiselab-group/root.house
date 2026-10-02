import { useTranslations } from "next-intl";

/**
 * The start of StoryArticle under the hero (classes from story-article.tsx
 * and article/story-blocks.tsx at desktop size): the lead, chapter one with
 * its first paragraph, and a letter on paper — fading out where the frame
 * cuts the page off.
 */
export function StoryPageArticle({ height }: { height: number }) {
  const t = useTranslations("stories");
  const tl = useTranslations("landing.storyPage");
  return (
    <div
      className="overflow-hidden bg-background mask-[linear-gradient(to_bottom,black_40%,transparent)]"
      style={{ height }}
    >
      <div className="mx-auto flex max-w-176 flex-col gap-7 px-8 pt-16 pb-10">
        <p className="max-w-[34ch] text-[1.9rem] leading-[1.42] tracking-[-0.012em] text-pretty">
          {tl("lead")}
        </p>
        <p className="mt-6 flex flex-col gap-1.5 font-heading text-[1.875rem] leading-[1.25] font-normal text-balance">
          <span className="font-sans text-xs tracking-[0.12em] text-foreground/45 uppercase">
            {t("chapter", { number: 1 })}
          </span>
          {tl("chapterTitle")}
        </p>
        <p className="text-lg leading-[1.75] text-foreground/85">
          {tl("paragraph")}
        </p>
        <figure className="my-3 flex -rotate-[0.6deg] flex-col gap-3.5 rounded-md bg-paper bg-[radial-gradient(color-mix(in_oklch,var(--paper-ink)_7%,transparent)_1px,transparent_1.2px)] bg-size-[5px_5px] px-9 pt-8 pb-6.5 text-paper-ink shadow-[0_24px_40px_-24px_color-mix(in_oklch,black_70%,transparent)]">
          <p className="font-heading text-xl leading-[1.6] text-pretty italic">
            {tl("letter")}
          </p>
          <figcaption className="border-t border-paper-ink/18 pt-2.5 text-[0.8125rem] text-paper-ink/65">
            {tl("letterCaption")}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
