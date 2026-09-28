import { useTranslations } from "next-intl";
import type { StoryList, StoryParagraph } from "@/domain/story/story-doc";
import type { StoryLayoutBlock } from "@/domain/story/story-layout";
import { StoryInlineContent } from "./story-inline";
import { StoryFigure } from "./story-figure";
import type { StoryRefs } from "./story-refs";

const PARAGRAPH_CLASS =
  "max-w-[62ch] text-[1.0625rem] leading-[1.72] text-pretty text-foreground/90 sm:text-lg";

/** One block of the story's reading column (StoryArticle). */
export function StoryBlockView({
  block,
  refs,
}: {
  block: StoryLayoutBlock;
  refs: StoryRefs;
}) {
  switch (block.type) {
    case "chapter":
      return <StoryChapterHeading {...block} />;
    case "paragraph":
      return (
        <Paragraph block={block} refs={refs} className={PARAGRAPH_CLASS} />
      );
    case "blockquote":
      return (
        <blockquote className="my-2 flex flex-col gap-3 border-l-[1.5px] border-tree-accent pl-5 font-heading text-[1.375rem] leading-[1.45] text-pretty italic sm:pl-6 sm:text-[1.625rem]">
          {block.content.map((paragraph, index) => (
            <Paragraph key={index} block={paragraph} refs={refs} />
          ))}
        </blockquote>
      );
    case "bulletList":
    case "orderedList":
      return <List list={block} refs={refs} />;
    case "storyPhoto":
      return <StoryFigure block={block} refs={refs} />;
    case "storyLetter":
      return (
        <figure className="my-3 flex -rotate-[0.6deg] flex-col gap-3.5 rounded-md bg-paper bg-[radial-gradient(color-mix(in_oklch,var(--paper-ink)_7%,transparent)_1px,transparent_1.2px)] bg-size-[5px_5px] px-5.5 pt-6 pb-5 text-paper-ink shadow-[0_24px_40px_-24px_color-mix(in_oklch,black_70%,transparent)] motion-reduce:rotate-0 sm:px-9 sm:pt-8 sm:pb-6.5">
          {block.content.map((paragraph, index) => (
            <Paragraph
              key={index}
              block={paragraph}
              refs={refs}
              className="font-heading text-lg leading-[1.6] text-pretty italic sm:text-xl"
            />
          ))}
          {block.attrs.caption && (
            <figcaption className="border-t border-paper-ink/18 pt-2.5 text-[0.8125rem] text-paper-ink/65">
              {block.attrs.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}

function StoryChapterHeading({
  id,
  number,
  title,
}: {
  id: string;
  number: number;
  title: string;
}) {
  const t = useTranslations("stories");
  return (
    <h2
      id={id}
      className="mt-6 flex scroll-mt-[calc(var(--app-header-h,0px)+4.5rem)] flex-col gap-1.5 font-heading text-heading font-normal text-balance"
    >
      <span className="text-xs tracking-[0.12em] text-foreground/45 uppercase">
        {t("chapter", { number })}
      </span>
      {title}
    </h2>
  );
}

function Paragraph({
  block,
  refs,
  className,
}: {
  block: StoryParagraph;
  refs: StoryRefs;
  className?: string;
}) {
  return (
    <p className={className}>
      <StoryInlineContent content={block.content ?? []} refs={refs} />
    </p>
  );
}

function List({ list, refs }: { list: StoryList; refs: StoryRefs }) {
  const items = list.content.map((item, index) => (
    <li key={index} className="pl-1.5">
      {item.content.map((child, childIndex) =>
        child.type === "paragraph" ? (
          <Paragraph key={childIndex} block={child} refs={refs} />
        ) : (
          <List key={childIndex} list={child} refs={refs} />
        ),
      )}
    </li>
  ));
  const className = `${PARAGRAPH_CLASS} flex flex-col gap-1.5 pl-6 marker:text-foreground/45`;
  return list.type === "orderedList" ? (
    <ol start={list.attrs.start} className={`${className} list-decimal`}>
      {items}
    </ol>
  ) : (
    <ul className={`${className} list-disc`}>{items}</ul>
  );
}
