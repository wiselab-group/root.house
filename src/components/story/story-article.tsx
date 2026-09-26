import type { StoryLayout } from "@/domain/story/story-layout";

/**
 * The Story's text as a reading column: the lead in large type, chapters as
 * numbered headings (anchor targets for StoryChaptersNav), paragraphs at a
 * comfortable 18px/1.7. Line breaks typed inside one paragraph are kept.
 */
export function StoryArticle({ layout }: { layout: StoryLayout }) {
  return (
    <article className="mx-auto flex max-w-[44rem] flex-col gap-7 px-4 pt-12 pb-10 sm:px-8 sm:pt-16">
      {layout.lead && (
        <p className="max-w-[34ch] text-2xl leading-snug tracking-[-0.012em] text-pretty whitespace-pre-wrap sm:text-[1.9rem] sm:leading-[1.42]">
          {layout.lead}
        </p>
      )}
      {layout.blocks.map((block, index) =>
        block.type === "chapter" ? (
          <h2
            key={block.id}
            id={block.id}
            className="mt-6 flex scroll-mt-[calc(var(--app-header-h,0px)+4.5rem)] flex-col gap-1.5 font-heading text-2xl font-normal text-balance sm:text-3xl"
          >
            <span className="text-xs tracking-[0.12em] text-foreground/45 uppercase">
              Глава {block.number}
            </span>
            {block.title}
          </h2>
        ) : (
          <p
            key={index}
            className="max-w-[62ch] text-[1.0625rem] leading-[1.72] text-pretty whitespace-pre-wrap text-foreground/90 sm:text-lg"
          >
            {block.text}
          </p>
        ),
      )}
    </article>
  );
}
